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

use super::{Audience, HostClaim, Outbox, Room, Viewer};
use crate::{
    limits,
    protocol::{ClientMessage, RejectReason, ServerMessage},
    registry::{Registry, RoomHandle},
    usage,
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
    /// A screen: just watching, or hosting with `host` (the room's creator, or the host screen back after a reload).
    Watch {
        host: Option<HostClaim>,
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
    /// The host screen: it may change settings and start rounds, and keeps the room open like a player.
    hosting: bool,
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
    // Anything a person does: joining, drawing, voting, settings. Pings and server timers don't count.
    let mut last_activity = Instant::now();
    let opened = Instant::now();

    // Why it ended, for the usage log; None when the registry itself went away.
    let closed = loop {
        let grace = if seated_anyone {
            limits::EMPTY_ROOM_GRACE
        } else {
            limits::UNUSED_ROOM_GRACE
        };
        let close_at = empty_since.map(|since| since + grace);
        let idle_at = Some(last_activity + limits::ROOM_IDLE_LIMIT);
        let tick_at = room.next_deadline(Instant::now().into_std()).map(Instant::from_std);
        let wake_at = [close_at, idle_at, tick_at].into_iter().flatten().min();

        let command = tokio::select! {
            command = commands.recv() => match command {
                Some(command) => Some(command),
                None => break None,
            },
            () = sleep_until(wake_at.unwrap_or_else(Instant::now)), if wake_at.is_some() => None,
        };
        let now = Instant::now();
        match &command {
            Some(RoomCommand::Join { .. } | RoomCommand::Watch { .. }) => last_activity = now,
            Some(RoomCommand::Message { message, .. }) if !matches!(message, ClientMessage::Ping) => {
                last_activity = now;
            }
            _ => {}
        }
        let mut connect = |viewer: Viewer,
                           hosting: bool,
                           connections: &mut HashMap<ConnectionId, Connection>,
                           first: ServerMessage| {
            let (sender, receiver) = mpsc::channel(limits::OUTBOX_CAPACITY);
            let id = next_connection;
            next_connection += 1;
            sender
                .try_send(first)
                .expect("a fresh channel has room for one message");
            connections.insert(
                id,
                Connection {
                    viewer,
                    hosting,
                    sender,
                },
            );
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
                    replace_connections(&mut connections, |connection| connection.viewer == viewer);
                    let joined = ServerMessage::Joined {
                        you: Some(seat.player_id),
                        session_token: Some(seat.session_token),
                        room: Box::new(room.snapshot(viewer, now.into_std())),
                        server_version: crate::VERSION.into(),
                    };
                    let entered = connect(viewer, false, &mut connections, joined);
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
            Some(RoomCommand::Watch { host, reply }) => {
                let watchers = connections
                    .values()
                    .filter(|connection| connection.viewer == Viewer::Screen && !connection.hosting)
                    .count();
                let (session_token, outbox) = match host {
                    Some(claim) => room.attach_host_screen(claim, now.into_std()),
                    None => (None, Vec::new()),
                };
                let hosting = session_token.is_some();
                // The cap is for watchers: the host screen always gets back in.
                if !hosting && watchers >= limits::MAX_SCREENS {
                    let _ = reply.send(Err(RejectReason::RoomFull));
                    outbox
                } else {
                    if hosting {
                        // The host screen on a new connection (a reload, another tab): the old one hears why.
                        replace_connections(&mut connections, |connection| connection.hosting);
                    }
                    let joined = ServerMessage::Joined {
                        you: None,
                        session_token,
                        room: Box::new(room.snapshot(Viewer::Screen, now.into_std())),
                        server_version: crate::VERSION.into(),
                    };
                    let entered = connect(Viewer::Screen, hosting, &mut connections, joined);
                    let id = entered.0;
                    if reply.send(Ok(entered)).is_err() {
                        connections.remove(&id);
                        let mut outbox = outbox;
                        if hosting {
                            outbox.extend(room.detach_host_screen(now.into_std()));
                        }
                        outbox
                    } else {
                        outbox
                    }
                }
            }
            Some(RoomCommand::Message { connection, message }) => match connections.get(&connection) {
                Some(Connection {
                    viewer: Viewer::Player(player_id),
                    ..
                }) => room.handle(*player_id, message, now.into_std()),
                Some(Connection {
                    viewer: Viewer::Screen,
                    hosting,
                    sender,
                }) => {
                    if matches!(message, ClientMessage::Ping) {
                        let _ = sender.try_send(ServerMessage::Pong);
                        Vec::new()
                    } else if *hosting {
                        room.handle_host_screen(message, now.into_std())
                    } else {
                        Vec::new()
                    }
                }
                None => Vec::new(),
            },
            Some(RoomCommand::Leave { connection }) => match connections.remove(&connection) {
                Some(Connection {
                    viewer: Viewer::Player(player_id),
                    ..
                }) => room.disconnect(player_id, now.into_std()),
                Some(Connection { hosting: true, .. }) => room.detach_host_screen(now.into_std()),
                _ => Vec::new(),
            },
            None => room.tick(now.into_std()),
        };

        deliver(&mut connections, &mut room, outbox, now);

        if now >= last_activity + limits::ROOM_IDLE_LIMIT {
            tracing::debug!(code = room.code(), "closing a room nobody has played in for a while");
            let closed = vec![(
                Audience::Everyone,
                ServerMessage::Rejected {
                    reason: RejectReason::RoomClosed,
                },
            )];
            dispatch(&connections, closed);
            break Some(usage::Closed::Idle);
        }

        let players_here = connections
            .values()
            .any(|connection| connection.viewer != Viewer::Screen || connection.hosting);
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
                break Some(if seated_anyone {
                    usage::Closed::Empty
                } else {
                    usage::Closed::Unused
                });
            }
        }
    };
    if let Some(closed) = closed {
        usage::room_closed(closed, opened.elapsed());
    }

    tracing::debug!(code = room.code(), "room closed");
    if let Some(registry) = registry.upgrade() {
        registry.remove(room.code());
    }
}

/// A newer connection takes over a seat or the host screen: the old one hears why, then closes (dropping its sender
/// ends it).
fn replace_connections(connections: &mut HashMap<ConnectionId, Connection>, replaced: impl Fn(&Connection) -> bool) {
    connections.retain(|_, connection| {
        if !replaced(connection) {
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
        for id in dropped {
            tracing::debug!(connection = id, "dropping a connection that can't keep up");
            match connections.remove(&id) {
                Some(Connection {
                    viewer: Viewer::Player(player_id),
                    ..
                }) => pending.extend(room.disconnect(player_id, now.into_std())),
                Some(Connection { hosting: true, .. }) => pending.extend(room.detach_host_screen(now.into_std())),
                _ => {}
            }
        }
    }
}

/// Returns connections whose queue is full or closed.
fn dispatch(connections: &HashMap<ConnectionId, Connection>, outbox: Outbox) -> Vec<ConnectionId> {
    let mut dropped: Vec<ConnectionId> = Vec::new();
    for (audience, message) in outbox {
        for (id, connection) in connections {
            let wanted = match (audience, connection.viewer) {
                (Audience::Everyone, _) => true,
                (Audience::Player(target), Viewer::Player(player_id)) => target == player_id,
                (Audience::Screens, Viewer::Screen) => true,
                _ => false,
            };
            if wanted && !dropped.contains(id) && connection.sender.try_send(message.clone()).is_err() {
                dropped.push(*id);
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
        screen(room, None).await
    }

    async fn screen(room: &RoomHandle, host: Option<HostClaim>) -> Result<Entered, RejectReason> {
        let (reply, answer) = oneshot::channel();
        room.commands.send(RoomCommand::Watch { host, reply }).await.unwrap();
        answer.await.unwrap()
    }

    fn registry() -> Arc<Registry> {
        let words = WordLibrary::load(&std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../words")).unwrap();
        Registry::new(Arc::new(words))
    }

    #[tokio::test(start_paused = true)]
    async fn a_room_nobody_joined_closes_soon() {
        let (_guard, events) = crate::logging::capture::start();
        let registry = registry();
        registry.create().unwrap();
        tokio::time::sleep(limits::UNUSED_ROOM_GRACE + Duration::from_secs(1)).await;
        assert_eq!(registry.room_count(), 0);
        let closed = crate::logging::capture::of(&events, crate::usage::TARGET, "room_closed");
        assert_eq!(closed.len(), 1);
        assert_eq!(closed[0]["reason"], "unused");
        assert_eq!(closed[0]["minutes_open"], "0");
    }

    #[tokio::test(start_paused = true)]
    async fn a_room_nobody_plays_in_closes_and_everyone_hears_why() {
        let (_guard, events) = crate::logging::capture::start();
        let registry = registry();
        let (_, room) = registry.create().unwrap();
        let (sam, mut sam_outbox) = join(&room, "Sam", None).await.unwrap();
        let (_, mut screen) = watch(&room).await.unwrap();

        // Pings keep the socket alive but aren't play.
        for _ in 0..10 {
            tokio::time::sleep(limits::ROOM_IDLE_LIMIT / 10).await;
            room.commands
                .send(RoomCommand::Message {
                    connection: sam,
                    message: ClientMessage::Ping,
                })
                .await
                .unwrap();
        }
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        assert_eq!(registry.room_count(), 0);
        let logged = crate::logging::capture::of(&events, crate::usage::TARGET, "room_closed");
        assert_eq!(logged.len(), 1);
        assert_eq!(logged[0]["reason"], "idle");
        assert_eq!(logged[0]["minutes_open"], "30");

        let closed = ServerMessage::Rejected {
            reason: RejectReason::RoomClosed,
        };
        for outbox in [&mut sam_outbox, &mut screen] {
            let mut seen = Vec::new();
            while let Some(message) = outbox.recv().await {
                seen.push(message);
            }
            assert!(seen.contains(&closed));
        }
    }

    #[tokio::test(start_paused = true)]
    async fn playing_keeps_a_room_open() {
        let registry = registry();
        let (_, room) = registry.create().unwrap();
        let (sam, _sam_outbox) = join(&room, "Sam", None).await.unwrap();
        for _ in 0..3 {
            tokio::time::sleep(limits::ROOM_IDLE_LIMIT - std::time::Duration::from_secs(60)).await;
            room.commands
                .send(RoomCommand::Message {
                    connection: sam,
                    message: ClientMessage::StartRound,
                })
                .await
                .unwrap();
        }
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        assert_eq!(registry.room_count(), 1);
    }

    #[tokio::test(start_paused = true)]
    async fn an_empty_room_closes_after_the_grace_and_screens_dont_keep_it_open() {
        let (_guard, events) = crate::logging::capture::start();
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
        let closed = crate::logging::capture::of(&events, crate::usage::TARGET, "room_closed");
        assert_eq!(closed.len(), 1);
        assert_eq!(closed[0]["reason"], "empty");
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

    async fn host_token(outbox: &mut mpsc::Receiver<ServerMessage>) -> String {
        match outbox.recv().await {
            Some(ServerMessage::Joined {
                session_token: Some(token),
                ..
            }) => token,
            other => panic!("not hosting: {other:?}"),
        }
    }

    #[tokio::test(start_paused = true)]
    async fn a_host_screen_keeps_its_room_open_while_it_waits_for_players() {
        let registry = registry();
        let (_, room) = registry.create().unwrap();
        let _tv = screen(&room, Some(HostClaim::New("Joris".into()))).await.unwrap();
        tokio::time::sleep(limits::UNUSED_ROOM_GRACE + limits::EMPTY_ROOM_GRACE).await;
        assert_eq!(registry.room_count(), 1);
    }

    #[tokio::test]
    async fn a_second_host_tab_takes_over_and_the_first_hears_why() {
        let registry = registry();
        let (_, room) = registry.create().unwrap();
        let (_, mut first) = screen(&room, Some(HostClaim::New("Joris".into()))).await.unwrap();
        let token = host_token(&mut first).await;

        let (_, mut second) = screen(&room, Some(HostClaim::Resume(token))).await.unwrap();
        host_token(&mut second).await;
        let mut seen = Vec::new();
        while let Some(message) = first.recv().await {
            seen.push(message);
        }
        assert!(seen.contains(&ServerMessage::Rejected {
            reason: RejectReason::Replaced
        }));
    }

    #[tokio::test]
    async fn the_host_screen_gets_back_in_when_watchers_fill_the_screens() {
        let registry = registry();
        let (_, room) = registry.create().unwrap();
        let (tv, mut tv_outbox) = screen(&room, Some(HostClaim::New("Joris".into()))).await.unwrap();
        let token = host_token(&mut tv_outbox).await;
        let mut watchers = Vec::new();
        for _ in 1..limits::MAX_SCREENS {
            watchers.push(watch(&room).await.unwrap());
        }
        room.commands.send(RoomCommand::Leave { connection: tv }).await.unwrap();
        watchers.push(watch(&room).await.unwrap());
        assert_eq!(watch(&room).await.unwrap_err(), RejectReason::RoomFull);

        let (_, mut back) = screen(&room, Some(HostClaim::Resume(token))).await.unwrap();
        host_token(&mut back).await;
    }

    #[tokio::test]
    async fn a_host_screen_that_cant_keep_up_hands_over_like_one_that_left() {
        let now = std::time::Instant::now();
        let mut room = Room::new("BKTZ".into(), Arc::new(WordLibrary::default()), 1);
        room.attach_host_screen(HostClaim::New("Joris".into()), now);
        let (slow, _slow_outbox) = mpsc::channel(1);
        let mut connections = HashMap::from([(
            1,
            Connection {
                viewer: Viewer::Screen,
                hosting: true,
                sender: slow,
            },
        )]);
        let outbox = vec![
            (Audience::Everyone, ServerMessage::Pong),
            (Audience::Everyone, ServerMessage::Pong),
        ];

        deliver(&mut connections, &mut room, outbox, Instant::now());
        assert!(connections.is_empty());
        assert!(room.host_screen.as_ref().is_some_and(|screen| !screen.connected));
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
                    hosting: false,
                    sender: slow,
                },
            ),
            (
                2,
                Connection {
                    viewer: Viewer::Player(noor.player_id),
                    hosting: false,
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
