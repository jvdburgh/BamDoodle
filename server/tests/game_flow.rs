//! A whole round over real WebSockets: create, join, watch, draw, vote, reveal, guess, points, reconnect.

use std::{path::Path, sync::Arc, time::Duration};

use bamdoodle_server::{
    app,
    protocol::{ClientMessage, PhaseView, PlayerId, Point, RejectReason, Role, RoomSettings, ServerMessage},
    registry::Registry,
    room::Room,
    words::WordLibrary,
};
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream, connect_async, tungstenite::Message};

struct Client {
    socket: WebSocketStream<MaybeTlsStream<TcpStream>>,
    seen: Vec<String>,
}

impl Client {
    async fn connect(address: &str) -> Self {
        let (socket, _) = connect_async(format!("ws://{address}/ws")).await.unwrap();
        Self {
            socket,
            seen: Vec::new(),
        }
    }

    async fn send(&mut self, message: &ClientMessage) {
        let json = serde_json::to_string(message).unwrap();
        self.socket.send(Message::text(json)).await.unwrap();
    }

    /// The next server message that matches, skipping the others.
    async fn expect<T>(&mut self, mut pick: impl FnMut(ServerMessage) -> Option<T>) -> T {
        tokio::time::timeout(Duration::from_secs(5), async {
            loop {
                let message = self.socket.next().await.expect("socket closed").unwrap();
                let Message::Text(text) = message else { continue };
                self.seen.push(text.to_string());
                if let Some(found) = pick(serde_json::from_str(&text).unwrap()) {
                    return found;
                }
            }
        })
        .await
        .expect("timed out waiting for a message")
    }

    async fn joined(&mut self) -> (Option<PlayerId>, Option<String>, String, PhaseView) {
        self.expect(|message| match message {
            ServerMessage::Joined {
                you,
                session_token,
                room,
                server_version,
            } => {
                assert_eq!(server_version, bamdoodle_server::VERSION);
                Some((you, session_token, room.code, room.phase))
            }
            _ => None,
        })
        .await
    }
}

async fn start_server() -> String {
    start_server_with_registry().await.0
}

async fn start_server_with_registry() -> (String, Arc<Registry>) {
    let words = WordLibrary::load(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../words")).unwrap();
    let registry = Registry::new(Arc::new(words));
    let shared = registry.clone();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap().to_string();
    let static_dir = std::env::temp_dir();
    tokio::spawn(async move { axum::serve(listener, app(registry, &static_dir)).await.unwrap() });
    (address, shared)
}

#[tokio::test]
async fn a_whole_round_with_three_players_and_a_host_screen() {
    let address = start_server().await;

    let mut sam = Client::connect(&address).await;
    sam.send(&ClientMessage::CreateRoom {
        name: "Sam".into(),
        settings: None,
    })
    .await;
    let (Some(sam_id), _, code, phase) = sam.joined().await else {
        panic!("no seat")
    };
    assert_eq!(phase, PhaseView::Lobby);

    let mut players = vec![(sam_id, sam)];
    for name in ["Noor", "Jip"] {
        let mut client = Client::connect(&address).await;
        client
            .send(&ClientMessage::JoinRoom {
                code: code.to_lowercase(),
                name: name.into(),
                session_token: None,
            })
            .await;
        let (Some(id), Some(_), _, _) = client.joined().await else {
            panic!("no seat")
        };
        players.push((id, client));
    }

    let mut screen = Client::connect(&address).await;
    screen.send(&ClientMessage::WatchRoom { code: code.clone() }).await;
    let (you, token, _, _) = screen.joined().await;
    assert_eq!((you, token), (None, None));

    players[0].1.send(&ClientMessage::StartRound).await;
    let mut rounds = Vec::new();
    for (id, client) in &mut players {
        let round = client
            .expect(|message| match message {
                ServerMessage::RoundStarted { round } => Some(round),
                _ => None,
            })
            .await;
        rounds.push((*id, round));
    }
    let screen_round = screen
        .expect(|message| match message {
            ServerMessage::RoundStarted { round } => Some(round),
            _ => None,
        })
        .await;
    assert_eq!((screen_round.word, screen_round.role), (None, None));

    let bamboozler = rounds
        .iter()
        .find(|(_, round)| round.role == Some(Role::Bamboozler))
        .unwrap()
        .0;
    let word = rounds.iter().find_map(|(_, round)| round.word.clone()).unwrap();
    let active = rounds[0].1.active_player_id.unwrap();
    assert_eq!(
        rounds
            .iter()
            .filter(|(_, round)| round.role == Some(Role::Bamboozler))
            .count(),
        1
    );

    let artists: Vec<PlayerId> = players
        .iter()
        .map(|(id, _)| *id)
        .filter(|id| *id != bamboozler)
        .collect();
    let (_, suspicious) = players.iter_mut().find(|(id, _)| *id == artists[0]).unwrap();
    suspicious
        .send(&ClientMessage::Suspect {
            suspect_id: Some(bamboozler),
        })
        .await;
    let suspicion = screen
        .expect(|message| match message {
            ServerMessage::SuspicionChanged { player_id, suspect_id } => Some((player_id, suspect_id)),
            _ => None,
        })
        .await;
    assert_eq!(suspicion, (artists[0], Some(bamboozler)));

    // Three turns each of one stroke, then the final vote.
    let mut active = active;
    let mut strokes = 0;
    loop {
        let drawer = players.iter_mut().find(|(id, _)| *id == active).unwrap();
        drawer
            .1
            .send(&ClientMessage::BeginStroke {
                colour: "#2da8c3".into(),
                size: bamdoodle_server::protocol::BrushSize::Bold,
                points: vec![Point(0.1, 0.2, 0.5), Point(0.3, 0.4, 0.5)],
            })
            .await;
        drawer.1.send(&ClientMessage::EndStroke).await;
        let stroke = screen
            .expect(|message| match message {
                ServerMessage::StrokeBegun { stroke } => Some(stroke),
                _ => None,
            })
            .await;
        assert_eq!(stroke.player_id, active);
        strokes += 1;

        let next = screen
            .expect(|message| match message {
                ServerMessage::TurnStarted { player_id, .. } => Some(Some(player_id)),
                ServerMessage::VotingStarted { .. } => Some(None),
                _ => None,
            })
            .await;
        match next {
            Some(player_id) => active = player_id,
            None => break,
        }
    }
    assert_eq!(strokes, 9);

    for (id, client) in &mut players {
        let suspect = if *id == bamboozler { artists[0] } else { bamboozler };
        client.send(&ClientMessage::CastVote { suspect_id: suspect }).await;
    }
    let reveal = screen
        .expect(|message| match message {
            ServerMessage::Revealed { reveal } => Some(reveal),
            _ => None,
        })
        .await;
    assert_eq!(reveal.bamboozler_id, bamboozler);
    assert_eq!(reveal.votes.len(), 3);

    let (_, cheat) = players.iter_mut().find(|(id, _)| *id == artists[0]).unwrap();
    cheat.send(&ClientMessage::GuessWord { guess: word.clone() }).await;
    let reason = cheat
        .expect(|message| match message {
            ServerMessage::Rejected { reason } => Some(reason),
            _ => None,
        })
        .await;
    assert_eq!(reason, RejectReason::NotBamboozler);

    let (_, guesser) = players.iter_mut().find(|(id, _)| *id == bamboozler).unwrap();
    guesser
        .send(&ClientMessage::GuessWord {
            guess: "no idea".into(),
        })
        .await;
    let result = screen
        .expect(|message| match message {
            ServerMessage::RoundFinished { result } => Some(result),
            _ => None,
        })
        .await;
    assert_eq!(result.word, word);
    assert!(!result.guess_correct);
    for artist in &artists {
        let score = result.scores.iter().find(|player| player.id == *artist).unwrap().score;
        assert_eq!(score, 1, "every artist caught the bamboozler");
    }

    let (_, bamboozler_client) = players.iter_mut().find(|(id, _)| *id == bamboozler).unwrap();
    bamboozler_client
        .expect(|message| matches!(message, ServerMessage::RoundFinished { .. }).then_some(()))
        .await;
    let before_the_result = bamboozler_client
        .seen
        .iter()
        .take_while(|text| !text.contains("\"roundFinished\""))
        .any(|text| text.contains(&word));
    assert!(
        !before_the_result,
        "the bamboozler's socket carried the word before the round was over"
    );
    assert!(
        !screen
            .seen
            .iter()
            .take_while(|text| !text.contains("\"roundFinished\""))
            .any(|text| text.contains(&word))
    );
}

#[tokio::test]
async fn a_dropped_player_takes_their_seat_back_with_the_session_token() {
    let address = start_server().await;

    let mut sam = Client::connect(&address).await;
    sam.send(&ClientMessage::CreateRoom {
        name: "Sam".into(),
        settings: None,
    })
    .await;
    let (_, _, code, _) = sam.joined().await;

    let mut noor = Client::connect(&address).await;
    noor.send(&ClientMessage::JoinRoom {
        code: code.clone(),
        name: "Noor".into(),
        session_token: None,
    })
    .await;
    let (Some(noor_id), Some(token), _, _) = noor.joined().await else {
        panic!("no seat")
    };
    drop(noor);

    let gone = sam
        .expect(|message| match message {
            ServerMessage::PlayerConnection { player_id, connected } => Some((player_id, connected)),
            _ => None,
        })
        .await;
    assert_eq!(gone, (noor_id, false));

    let mut noor = Client::connect(&address).await;
    noor.send(&ClientMessage::JoinRoom {
        code,
        name: "Noor".into(),
        session_token: Some(token),
    })
    .await;
    let (you, _, _, _) = noor.joined().await;
    assert_eq!(you, Some(noor_id));
}

#[tokio::test]
async fn unknown_rooms_and_messages_before_joining_are_turned_away() {
    let address = start_server().await;

    let mut client = Client::connect(&address).await;
    client
        .send(&ClientMessage::JoinRoom {
            code: "ZZZZ".into(),
            name: "Sam".into(),
            session_token: None,
        })
        .await;
    let reason = client
        .expect(|message| match message {
            ServerMessage::Rejected { reason } => Some(reason),
            _ => None,
        })
        .await;
    assert_eq!(reason, RejectReason::RoomNotFound);

    let mut client = Client::connect(&address).await;
    client.send(&ClientMessage::StartRound).await;
    let reason = client
        .expect(|message| match message {
            ServerMessage::Rejected { reason } => Some(reason),
            _ => None,
        })
        .await;
    assert_eq!(reason, RejectReason::NotJoined);
}

#[tokio::test]
async fn a_room_starts_with_the_settings_picked_before_it_existed() {
    let (address, registry) = start_server_with_registry().await;
    let settings = RoomSettings {
        rounds: 3,
        ..Room::default_settings(registry.words())
    };
    let mut sam = Client::connect(&address).await;
    sam.send(&ClientMessage::CreateRoom {
        name: "Sam".into(),
        settings: Some(settings.clone()),
    })
    .await;
    sam.joined().await;
    let changed = sam
        .expect(|message| match message {
            ServerMessage::SettingsChanged { settings } => Some(settings),
            _ => None,
        })
        .await;
    assert_eq!(changed, settings);
}

#[tokio::test]
async fn a_rejected_create_leaves_no_room_behind() {
    let (address, registry) = start_server_with_registry().await;
    let mut client = Client::connect(&address).await;
    client
        .send(&ClientMessage::CreateRoom {
            name: "   ".into(),
            settings: None,
        })
        .await;
    let reason = client
        .expect(|message| match message {
            ServerMessage::Rejected { reason } => Some(reason),
            _ => None,
        })
        .await;
    assert_eq!(reason, RejectReason::InvalidName);
    assert_eq!(registry.room_count(), 0);
}

#[tokio::test]
async fn a_second_device_with_the_same_token_replaces_the_first() {
    let address = start_server().await;
    let mut first = Client::connect(&address).await;
    first
        .send(&ClientMessage::CreateRoom {
            name: "Sam".into(),
            settings: None,
        })
        .await;
    let (_, Some(token), code, _) = first.joined().await else {
        panic!("no seat")
    };

    let mut second = Client::connect(&address).await;
    second
        .send(&ClientMessage::JoinRoom {
            code,
            name: "Sam".into(),
            session_token: Some(token),
        })
        .await;
    second.joined().await;
    let reason = first
        .expect(|message| match message {
            ServerMessage::Rejected { reason } => Some(reason),
            _ => None,
        })
        .await;
    assert_eq!(reason, RejectReason::Replaced);
}
