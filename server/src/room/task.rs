//! The task that runs one room: it owns the `Room`, its connections and its timers, and handles one command at a
//! time, so game state needs no locks.

use std::{
    collections::HashMap,
    sync::{Arc, Weak},
};

use tokio::{
    sync::{mpsc, oneshot},
    time::{Instant, sleep_until},
};

use super::{Audience, Outbox, Room, Viewer};
use crate::{
    limits,
    protocol::{ClientMessage, PlayerId, RejectReason, ServerMessage},
    registry::{Registry, RoomHandle},
    words::WordLibrary,
};

pub type ConnectionId = u64;
pub type Entered = (ConnectionId, mpsc::Receiver<ServerMessage>);

pub enum RoomCommand {
    Join {
        name: String,
        session_token: Option<String>,
        reply: oneshot::Sender<Result<Entered, RejectReason>>,
    },
    Watch {
        reply: oneshot::Sender<Result<Entered, RejectReason>>,
    },
    Message {
        connection: ConnectionId,
        message: ClientMessage,
    },
    Leave {
        connection: ConnectionId,
    },
}

struct Connection {
    viewer: Viewer,
    sender: mpsc::Sender<ServerMessage>,
}

pub fn spawn(code: String, words: Arc<WordLibrary>, seed: u64, registry: Weak<Registry>) -> RoomHandle {
    let (commands, receiver) = mpsc::channel(limits::ROOM_COMMAND_CAPACITY);
    tokio::spawn(run(Room::new(code, words, seed), receiver, registry));
    RoomHandle { commands }
}

async fn run(mut room: Room, mut commands: mpsc::Receiver<RoomCommand>, registry: Weak<Registry>) {
    let mut connections: HashMap<ConnectionId, Connection> = HashMap::new();
    let mut next_connection: ConnectionId = 1;
    let mut seated_anyone = false;
    let mut empty_since = Some(Instant::now());

    loop {
        let grace = if seated_anyone {
            limits::EMPTY_ROOM_GRACE
        } else {
            limits::UNUSED_ROOM_GRACE
        };
        let close_at = empty_since.map(|since| since + grace);
        let tick_at = room.next_deadline(Instant::now().into_std()).map(Instant::from_std);
        let wake_at = [close_at, tick_at].into_iter().flatten().min();

        let command = tokio::select! {
            command = commands.recv() => match command {
                Some(command) => Some(command),
                None => break,
            },
            () = sleep_until(wake_at.unwrap_or_else(Instant::now)), if wake_at.is_some() => None,
        };
        let now = Instant::now();
        let mut connect =
            |viewer: Viewer, connections: &mut HashMap<ConnectionId, Connection>, first: ServerMessage| {
                let (sender, receiver) = mpsc::channel(limits::OUTBOX_CAPACITY);
                let id = next_connection;
                next_connection += 1;
                sender
                    .try_send(first)
                    .expect("a fresh channel has room for one message");
                connections.insert(id, Connection { viewer, sender });
                (id, receiver)
            };

        let outbox = match command {
            Some(RoomCommand::Join {
                name,
                session_token,
                reply,
            }) => match room.join(&name, session_token.as_deref(), now.into_std()) {
                Ok((seat, outbox)) => {
                    let viewer = Viewer::Player(seat.player_id);
                    replace_connection_of(&mut connections, viewer);
                    let joined = ServerMessage::Joined {
                        you: Some(seat.player_id),
                        session_token: Some(seat.session_token),
                        room: room.snapshot(viewer, now.into_std()),
                    };
                    let entered = connect(viewer, &mut connections, joined);
                    let id = entered.0;
                    seated_anyone = true;
                    if reply.send(Ok(entered)).is_ok() {
                        outbox
                    } else {
                        connections.remove(&id);
                        let mut outbox = outbox;
                        outbox.extend(room.disconnect(seat.player_id, now.into_std()));
                        outbox
                    }
                }
                Err(reason) => {
                    let _ = reply.send(Err(reason));
                    Vec::new()
                }
            },
            Some(RoomCommand::Watch { reply }) => {
                let screens = connections
                    .values()
                    .filter(|connection| connection.viewer == Viewer::Screen)
                    .count();
                if screens >= limits::MAX_SCREENS {
                    let _ = reply.send(Err(RejectReason::RoomFull));
                } else {
                    let joined = ServerMessage::Joined {
                        you: None,
                        session_token: None,
                        room: room.snapshot(Viewer::Screen, now.into_std()),
                    };
                    let entered = connect(Viewer::Screen, &mut connections, joined);
                    let id = entered.0;
                    if reply.send(Ok(entered)).is_err() {
                        connections.remove(&id);
                    }
                }
                Vec::new()
            }
            Some(RoomCommand::Message { connection, message }) => match connections.get(&connection) {
                Some(Connection {
                    viewer: Viewer::Player(player_id),
                    ..
                }) => room.handle(*player_id, message, now.into_std()),
                Some(Connection {
                    viewer: Viewer::Screen,
                    sender,
                }) => {
                    if matches!(message, ClientMessage::Ping) {
                        let _ = sender.try_send(ServerMessage::Pong);
                    }
                    Vec::new()
                }
                None => Vec::new(),
            },
            Some(RoomCommand::Leave { connection }) => match connections.remove(&connection) {
                Some(Connection {
                    viewer: Viewer::Player(player_id),
                    ..
                }) => room.disconnect(player_id, now.into_std()),
                _ => Vec::new(),
            },
            None => room.tick(now.into_std()),
        };

        deliver(&mut connections, &mut room, outbox, now);

        let players_here = connections
            .values()
            .any(|connection| connection.viewer != Viewer::Screen);
        if players_here {
            empty_since = None;
        } else {
            let since = *empty_since.get_or_insert(now);
            let grace = if seated_anyone {
                limits::EMPTY_ROOM_GRACE
            } else {
                limits::UNUSED_ROOM_GRACE
            };
            if now >= since + grace {
                break;
            }
        }
    }

    tracing::debug!(code = room.code(), "room closed");
    if let Some(registry) = registry.upgrade() {
        registry.remove(room.code());
    }
}

/// A newer connection takes over a seat: the old one hears why, then closes (dropping its sender ends it).
fn replace_connection_of(connections: &mut HashMap<ConnectionId, Connection>, viewer: Viewer) {
    connections.retain(|_, connection| {
        if connection.viewer != viewer {
            return true;
        }
        let _ = connection.sender.try_send(ServerMessage::Rejected {
            reason: RejectReason::Replaced,
        });
        false
    });
}

/// Sends every message to its audience. A connection that can't keep up is dropped and its player disconnected,
/// and the messages about that go through the same path until nobody else drops out.
fn deliver(connections: &mut HashMap<ConnectionId, Connection>, room: &mut Room, outbox: Outbox, now: Instant) {
    let mut pending = outbox;
    while !pending.is_empty() {
        let dropped = dispatch(connections, std::mem::take(&mut pending));
        for (id, player_id) in dropped {
            tracing::debug!(connection = id, "dropping a connection that can't keep up");
            connections.remove(&id);
            if let Some(player_id) = player_id {
                pending.extend(room.disconnect(player_id, now.into_std()));
            }
        }
    }
}

/// Returns connections whose queue is full or closed.
fn dispatch(connections: &HashMap<ConnectionId, Connection>, outbox: Outbox) -> Vec<(ConnectionId, Option<PlayerId>)> {
    let mut dropped: Vec<(ConnectionId, Option<PlayerId>)> = Vec::new();
    for (audience, message) in outbox {
        for (id, connection) in connections {
            let wanted = match (audience, connection.viewer) {
                (Audience::Everyone, _) => true,
                (Audience::Player(target), Viewer::Player(player_id)) => target == player_id,
                (Audience::Screens, Viewer::Screen) => true,
                _ => false,
            };
            if wanted
                && !dropped.iter().any(|(dropped_id, _)| dropped_id == id)
                && connection.sender.try_send(message.clone()).is_err()
            {
                let player_id = match connection.viewer {
                    Viewer::Player(player_id) => Some(player_id),
                    Viewer::Screen => None,
                };
                dropped.push((*id, player_id));
            }
        }
    }
    dropped
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::*;

    async fn join(room: &RoomHandle, name: &str, token: Option<String>) -> Result<Entered, RejectReason> {
        let (reply, answer) = oneshot::channel();
        room.commands
            .send(RoomCommand::Join {
                name: name.into(),
                session_token: token,
                reply,
            })
            .await
            .unwrap();
        answer.await.unwrap()
    }

    async fn watch(room: &RoomHandle) -> Result<Entered, RejectReason> {
        let (reply, answer) = oneshot::channel();
        room.commands.send(RoomCommand::Watch { reply }).await.unwrap();
        answer.await.unwrap()
    }

    fn registry() -> Arc<Registry> {
        let words = WordLibrary::load(&std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../words")).unwrap();
        Registry::new(Arc::new(words))
    }

    #[tokio::test(start_paused = true)]
    async fn a_room_nobody_joined_closes_soon() {
        let registry = registry();
        registry.create().unwrap();
        tokio::time::sleep(limits::UNUSED_ROOM_GRACE + Duration::from_secs(1)).await;
        assert_eq!(registry.room_count(), 0);
    }

    #[tokio::test(start_paused = true)]
    async fn an_empty_room_closes_after_the_grace_and_screens_dont_keep_it_open() {
        let registry = registry();
        let (_, room) = registry.create().unwrap();
        let (sam, _sam_outbox) = join(&room, "Sam", None).await.unwrap();
        let _screen = watch(&room).await.unwrap();
        room.commands
            .send(RoomCommand::Leave { connection: sam })
            .await
            .unwrap();

        tokio::time::sleep(limits::EMPTY_ROOM_GRACE - Duration::from_secs(10)).await;
        assert_eq!(registry.room_count(), 1);
        tokio::time::sleep(Duration::from_secs(20)).await;
        assert_eq!(registry.room_count(), 0);
    }

    #[tokio::test]
    async fn a_newer_connection_takes_over_the_seat_and_the_old_one_hears_why() {
        let registry = registry();
        let (_, room) = registry.create().unwrap();
        let (_, mut first) = join(&room, "Sam", None).await.unwrap();
        let Some(ServerMessage::Joined {
            session_token: Some(token),
            ..
        }) = first.recv().await
        else {
            panic!("no joined")
        };

        let (_, _second) = join(&room, "Sam", Some(token)).await.unwrap();
        let mut seen = Vec::new();
        while let Some(message) = first.recv().await {
            seen.push(message);
        }
        assert!(seen.contains(&ServerMessage::Rejected {
            reason: RejectReason::Replaced
        }));
    }

    #[tokio::test]
    async fn a_room_takes_a_handful_of_screens() {
        let registry = registry();
        let (_, room) = registry.create().unwrap();
        let mut screens = Vec::new();
        for _ in 0..limits::MAX_SCREENS {
            screens.push(watch(&room).await.unwrap());
        }
        assert_eq!(watch(&room).await.unwrap_err(), RejectReason::RoomFull);
    }

    #[tokio::test]
    async fn a_connection_that_cant_keep_up_is_dropped_and_its_player_disconnected() {
        let mut room = Room::new("BKTZ".into(), Arc::new(WordLibrary::default()), 1);
        let (sam, _) = room.join("Sam", None, std::time::Instant::now()).unwrap();
        let (noor, _) = room.join("Noor", None, std::time::Instant::now()).unwrap();
        let (slow, _slow_outbox) = mpsc::channel(1);
        let (fast, mut fast_outbox) = mpsc::channel(16);
        let mut connections = HashMap::from([
            (
                1,
                Connection {
                    viewer: Viewer::Player(sam.player_id),
                    sender: slow,
                },
            ),
            (
                2,
                Connection {
                    viewer: Viewer::Player(noor.player_id),
                    sender: fast,
                },
            ),
        ]);
        let outbox = vec![
            (Audience::Everyone, ServerMessage::Pong),
            (Audience::Everyone, ServerMessage::Pong),
        ];

        deliver(&mut connections, &mut room, outbox, Instant::now());
        assert!(!connections.contains_key(&1));
        let mut seen = Vec::new();
        while let Ok(message) = fast_outbox.try_recv() {
            seen.push(message);
        }
        assert!(seen.contains(&ServerMessage::PlayerConnection {
            player_id: sam.player_id,
            connected: false
        }));
    }
}
