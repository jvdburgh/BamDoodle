//! Messages exchanged over `/ws`. Every type here is exported to TypeScript by ts-rs
//! (`just protocol`), so the web app and the server can't drift apart.
//!
//! Client messages are intents ("I'd like to draw this"), server messages are facts ("this stroke was added").
//! Durations are sent as milliseconds remaining, never as clock times, so client clocks don't matter.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub type PlayerId = u32;
pub type StrokeId = u32;

/// A point on the canvas: x and y normalised to 0..=1, and pen pressure 0..=1 (0.5 when the device has none).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Point(pub f32, pub f32, pub f32);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum TurnMode {
    /// One stroke per turn, a set number of turns per player.
    OneStroke,
    /// A set number of seconds of free drawing per turn.
    Timed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Language {
    En,
    Nl,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum BrushSize {
    Fine,
    Medium,
    Bold,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Role {
    Artist,
    Bamboozler,
}

/// One line of a player's avatar, normalised to the avatar's square. Avatars use one pen, so there is no size.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AvatarStroke {
    /// One of the avatar palette's `#rrggbb` colours (`limits::AVATAR_COLOURS`).
    pub colour: String,
    /// False when the device had none: the client simulates it.
    pub pressure: bool,
    pub points: Vec<Point>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RoomSettings {
    pub mode: TurnMode,
    /// How often each player draws in one-stroke mode, 1 to 5 (timed turns: always twice).
    pub turns_per_player: u32,
    /// Length of a timed turn: 10, 20, 30 or 60.
    pub turn_seconds: u32,
    /// Rounds in a game; after the last one comes the final scoreboard.
    pub rounds: u32,
    pub language: Language,
    /// The word categories in play, by name, in `language`. Adult (18+) categories are only in play when picked.
    pub categories: Vec<String>,
}

impl Default for RoomSettings {
    /// No categories: a new room fills in its language's everyday ones (`Room::new`).
    fn default() -> Self {
        Self {
            // Timed turns, 20 s, twice each: what playtesters liked best (one stroke stays a choice).
            mode: TurnMode::Timed,
            turns_per_player: 3,
            turn_seconds: 20,
            rounds: 4,
            language: Language::En,
            categories: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum ClientMessage {
    /// First message on a new connection: start a room and join it as its host, with the settings the host picked
    /// before the room existed (checked like any later change; the defaults when missing or not allowed).
    #[serde(rename_all = "camelCase")]
    CreateRoom {
        name: String,
        settings: Option<RoomSettings>,
    },
    /// First message on a new connection: join a room as a player. With a session token, take back your seat.
    #[serde(rename_all = "camelCase")]
    JoinRoom {
        code: String,
        name: String,
        session_token: Option<String>,
    },
    /// First message on a new connection: follow a room as a host screen (TV, beamer) that never sees the word.
    #[serde(rename_all = "camelCase")]
    WatchRoom {
        code: String,
    },
    /// Host only, between rounds.
    #[serde(rename_all = "camelCase")]
    UpdateSettings {
        settings: RoomSettings,
    },
    /// Any seated player, any time: replaces your whole avatar.
    #[serde(rename_all = "camelCase")]
    SetAvatar {
        strokes: Vec<AvatarStroke>,
    },
    /// Any seated player: done with their face and in the room (the host can see who's still drawing theirs).
    Ready,
    /// Host only, between rounds. After the final scoreboard, this starts a new game.
    StartRound,
    /// The active player starts a stroke. `colour` is `#rrggbb`.
    #[serde(rename_all = "camelCase")]
    BeginStroke {
        colour: String,
        size: BrushSize,
        points: Vec<Point>,
    },
    /// The active player adds points to the stroke they're drawing.
    #[serde(rename_all = "camelCase")]
    ExtendStroke {
        points: Vec<Point>,
    },
    /// The active player lifts the pen.
    EndStroke,
    /// While the drawing goes on: who you suspect right now, for everyone to see. Change it as often as you like;
    /// `null` takes it back.
    #[serde(rename_all = "camelCase")]
    Suspect {
        suspect_id: Option<PlayerId>,
    },
    /// Your final answer in the "Who's sketchy?" vote after the drawing. Once per round.
    #[serde(rename_all = "camelCase")]
    CastVote {
        suspect_id: PlayerId,
    },
    /// The bamboozler's one guess, after the reveal.
    #[serde(rename_all = "camelCase")]
    GuessWord {
        guess: String,
    },
    Ping,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum ServerMessage {
    /// Answer to `createRoom`, `joinRoom` and `watchRoom`: who you are and the whole room as you may see it.
    /// `you` and `sessionToken` are absent for a host screen. Keep the token to take back your seat later.
    #[serde(rename_all = "camelCase")]
    Joined {
        you: Option<PlayerId>,
        session_token: Option<String>,
        room: Box<RoomSnapshot>,
        /// The release the server runs, e.g. `v0.1.0` (`dev` locally). A web app built for another release reloads.
        server_version: String,
    },
    #[serde(rename_all = "camelCase")]
    PlayerJoined {
        player: PlayerSummary,
    },
    #[serde(rename_all = "camelCase")]
    PlayerConnection {
        player_id: PlayerId,
        connected: bool,
    },
    #[serde(rename_all = "camelCase")]
    PlayerRemoved {
        player_id: PlayerId,
    },
    #[serde(rename_all = "camelCase")]
    AvatarChanged {
        player_id: PlayerId,
        strokes: Vec<AvatarStroke>,
    },
    /// A player finished their face and is in the room.
    #[serde(rename_all = "camelCase")]
    PlayerReady {
        player_id: PlayerId,
    },
    #[serde(rename_all = "camelCase")]
    HostChanged {
        host_id: PlayerId,
    },
    #[serde(rename_all = "camelCase")]
    SettingsChanged {
        settings: RoomSettings,
    },
    /// A new game begins (the first round, or a new game after the final scoreboard): scores start from here.
    #[serde(rename_all = "camelCase")]
    GameStarted {
        scores: Vec<PlayerSummary>,
    },
    /// Sent to each viewer separately: only artists get the word.
    #[serde(rename_all = "camelCase")]
    RoundStarted {
        round: RoundView,
    },
    #[serde(rename_all = "camelCase")]
    TurnStarted {
        player_id: PlayerId,
        duration_ms: u32,
        turn: u32,
    },
    #[serde(rename_all = "camelCase")]
    StrokeBegun {
        stroke: StrokeView,
    },
    #[serde(rename_all = "camelCase")]
    StrokeExtended {
        stroke_id: StrokeId,
        points: Vec<Point>,
    },
    #[serde(rename_all = "camelCase")]
    StrokeEnded {
        stroke_id: StrokeId,
    },
    /// Who someone suspects now, during the drawing. Public on purpose.
    #[serde(rename_all = "camelCase")]
    SuspicionChanged {
        player_id: PlayerId,
        suspect_id: Option<PlayerId>,
    },
    /// The last turn is over: "Who's sketchy?" Everyone makes their final choice.
    #[serde(rename_all = "camelCase")]
    VotingStarted {
        duration_ms: u32,
    },
    /// Someone voted. Who they voted for stays secret until the reveal.
    #[serde(rename_all = "camelCase")]
    VoteCast {
        voter_id: PlayerId,
    },
    /// Voting is over: here's the bamboozler and every vote. The bamboozler now gets to guess the word.
    #[serde(rename_all = "camelCase")]
    Revealed {
        reveal: Reveal,
    },
    #[serde(rename_all = "camelCase")]
    RoundFinished {
        result: RoundResult,
    },
    /// Something you asked for wasn't allowed. Only sent to you.
    #[serde(rename_all = "camelCase")]
    Rejected {
        reason: RejectReason,
    },
    Pong,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum RejectReason {
    RoomNotFound,
    RoomFull,
    TooManyRooms,
    InvalidName,
    NameTaken,
    NotJoined,
    AlreadyJoined,
    NotHost,
    NotEnoughPlayers,
    InvalidSettings,
    WrongPhase,
    InvalidVote,
    NotBamboozler,
    /// Your seat was taken over by a newer connection with the same session token. Don't reconnect.
    Replaced,
    /// The room was closed after a long time without play. Don't reconnect; start or join another room.
    RoomClosed,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PlayerSummary {
    pub id: PlayerId,
    pub name: String,
    pub score: u32,
    pub connected: bool,
    /// Empty until the player sends one.
    pub avatar: Vec<AvatarStroke>,
    /// Done with their face (`ready`); false while they're still drawing it.
    pub ready: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RoomSnapshot {
    pub code: String,
    pub host_id: Option<PlayerId>,
    pub players: Vec<PlayerSummary>,
    pub settings: RoomSettings,
    /// Every category the host can pick from, in every language.
    pub word_categories: Vec<WordCategory>,
    pub phase: PhaseView,
}

/// `GET /api/room-defaults`: what a new room starts with and every category, so a host can set up a room before it
/// exists (settings first, then your name, then the room is created).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RoomDefaults {
    pub settings: RoomSettings,
    pub word_categories: Vec<WordCategory>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct WordCategory {
    pub language: Language,
    pub name: String,
    /// 18+: never picked unless the host picks it.
    pub adult: bool,
    pub words: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "phase", rename_all = "camelCase")]
#[ts(export)]
pub enum PhaseView {
    Lobby,
    #[serde(rename_all = "camelCase")]
    Drawing {
        round: RoundView,
    },
    #[serde(rename_all = "camelCase")]
    Voting {
        round: RoundView,
        voting_remaining_ms: u32,
    },
    #[serde(rename_all = "camelCase")]
    Guessing {
        round: RoundView,
        reveal: Reveal,
    },
    /// `strokes` is the finished drawing, for a device that joins or reconnects during the results (the others
    /// already have it, so `roundFinished` doesn't repeat it).
    #[serde(rename_all = "camelCase")]
    Finished {
        result: RoundResult,
        strokes: Vec<StrokeView>,
    },
}

/// A round as one viewer may see it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RoundView {
    pub number: u32,
    /// Rounds in this game.
    pub rounds: u32,
    pub category: String,
    /// Absent for the bamboozler and for host screens.
    pub word: Option<String>,
    /// Absent for host screens.
    pub role: Option<Role>,
    pub turn_order: Vec<PlayerId>,
    pub active_player_id: Option<PlayerId>,
    pub turn_remaining_ms: u32,
    /// The turn being drawn, from 1 to `turns_per_player`.
    pub turn: u32,
    pub turns_per_player: u32,
    pub strokes: Vec<StrokeView>,
    /// Who suspects whom right now. Public.
    pub suspicions: Vec<Suspicion>,
    /// Who has cast their final vote (not for whom).
    pub voted: Vec<PlayerId>,
    pub your_vote: Option<PlayerId>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct StrokeView {
    pub id: StrokeId,
    pub player_id: PlayerId,
    pub colour: String,
    pub size: BrushSize,
    pub points: Vec<Point>,
    pub done: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Suspicion {
    pub player_id: PlayerId,
    pub suspect_id: PlayerId,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Vote {
    pub voter_id: PlayerId,
    pub suspect_id: PlayerId,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Reveal {
    pub bamboozler_id: PlayerId,
    pub votes: Vec<Vote>,
    pub guess_remaining_ms: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RoundResult {
    pub number: u32,
    pub rounds: u32,
    /// The last round of the game: show the final scoreboard. The host's next `startRound` begins a new game.
    pub game_over: bool,
    pub category: String,
    pub word: String,
    pub bamboozler_id: PlayerId,
    pub guess: Option<String>,
    pub guess_correct: bool,
    pub votes: Vec<Vote>,
    pub awards: Vec<Award>,
    pub scores: Vec<PlayerSummary>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum AwardReason {
    CaughtTheBamboozler,
    GuessedTheWord,
    StayedHidden,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Award {
    pub player_id: PlayerId,
    pub reason: AwardReason,
    pub points: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn client_messages_are_tagged_camel_case_json() {
        let message: ClientMessage =
            serde_json::from_str(r#"{ "type": "joinRoom", "code": "BKTZ", "name": "Sam", "sessionToken": null }"#)
                .unwrap();
        assert!(matches!(message, ClientMessage::JoinRoom { code, .. } if code == "BKTZ"));

        let message: ClientMessage = serde_json::from_str(
            r##"{ "type": "beginStroke", "colour": "#f13866", "size": "fine", "points": [[0.5, 0.25, 0.5]] }"##,
        )
        .unwrap();
        assert!(matches!(message, ClientMessage::BeginStroke { points, .. } if points == vec![Point(0.5, 0.25, 0.5)]));

        let message: ClientMessage = serde_json::from_str(r#"{ "type": "suspect", "suspectId": null }"#).unwrap();
        assert!(matches!(message, ClientMessage::Suspect { suspect_id: None }));

        let message: ClientMessage = serde_json::from_str(
            r##"{ "type": "setAvatar", "strokes": [{ "colour": "#ffffff", "pressure": false, "points": [[0.5, 0.25, 0.5]] }] }"##,
        )
        .unwrap();
        assert!(
            matches!(message, ClientMessage::SetAvatar { strokes } if strokes[0].points == vec![Point(0.5, 0.25, 0.5)])
        );
    }

    #[test]
    fn server_messages_are_tagged_camel_case_json() {
        let message = ServerMessage::TurnStarted {
            player_id: 2,
            duration_ms: 10_000,
            turn: 1,
        };
        let json = serde_json::to_value(&message).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "type": "turnStarted", "playerId": 2, "durationMs": 10000, "turn": 1 })
        );

        let message = ServerMessage::AvatarChanged {
            player_id: 2,
            strokes: vec![AvatarStroke {
                colour: "#ffffff".into(),
                pressure: true,
                points: vec![Point(0.5, 0.25, 0.75)],
            }],
        };
        let json = serde_json::to_value(&message).unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "type": "avatarChanged",
                "playerId": 2,
                "strokes": [{ "colour": "#ffffff", "pressure": true, "points": [[0.5, 0.25, 0.75]] }]
            })
        );
    }

    #[test]
    fn the_biggest_avatar_fits_in_one_message() {
        let points = vec![Point(0.123, 0.456, 0.789); crate::limits::AVATAR_POINTS / crate::limits::AVATAR_STROKES + 1];
        let mut strokes = vec![
            AvatarStroke {
                colour: "#ffffff".into(),
                pressure: false,
                points,
            };
            crate::limits::AVATAR_STROKES
        ];
        let surplus = strokes.iter().map(|stroke| stroke.points.len()).sum::<usize>() - crate::limits::AVATAR_POINTS;
        for stroke in &mut strokes[..surplus] {
            stroke.points.pop();
        }
        let json = serde_json::to_string(&ClientMessage::SetAvatar { strokes }).unwrap();
        assert!(json.len() <= crate::limits::MAX_MESSAGE_BYTES, "{} bytes", json.len());
    }

    #[test]
    fn ready_is_tagged_like_every_message() {
        assert_eq!(
            serde_json::to_value(ClientMessage::Ready).unwrap(),
            serde_json::json!({ "type": "ready" })
        );
        assert_eq!(
            serde_json::to_value(ServerMessage::PlayerReady { player_id: 2 }).unwrap(),
            serde_json::json!({ "type": "playerReady", "playerId": 2 })
        );
    }

    #[test]
    fn settings_use_the_names_the_ui_shows() {
        let json = serde_json::to_value(RoomSettings::default()).unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "mode": "timed", "turnsPerPlayer": 3, "turnSeconds": 20, "rounds": 4, "language": "en", "categories": []
            })
        );
    }

    #[test]
    fn phase_views_are_tagged_by_phase() {
        let json = serde_json::to_value(PhaseView::Lobby).unwrap();
        assert_eq!(json, serde_json::json!({ "phase": "lobby" }));
    }
}

/// `POST /api/client-error`: an error a browser caught (an uncaught exception or rejected promise), for the logs.
/// Nothing about the player: no name, no room code (the page is only which screen), no IP address.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ClientErrorReport {
    pub message: String,
    pub stack: Option<String>,
    /// The web app's release, e.g. v0.1.5.
    pub version: String,
    /// Which screen: start, join, watch or other.
    pub page: String,
}
