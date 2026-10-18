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
    /// One stroke per turn.
    Classic,
    /// A few seconds of free drawing per turn.
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RoomSettings {
    pub mode: TurnMode,
    pub language: Language,
    /// Mix the adults pack (18+) into the words.
    pub adults: bool,
    pub round_seconds: u32,
}

impl Default for RoomSettings {
    fn default() -> Self {
        Self {
            mode: TurnMode::Classic,
            language: Language::En,
            adults: false,
            round_seconds: 60,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum ClientMessage {
    /// First message on a new connection: start a room and join it as its host.
    #[serde(rename_all = "camelCase")]
    CreateRoom {
        name: String,
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
    /// Host only, between rounds.
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
    /// Once per round, while drawing goes on.
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
        room: RoomSnapshot,
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
    HostChanged {
        host_id: PlayerId,
    },
    #[serde(rename_all = "camelCase")]
    SettingsChanged {
        settings: RoomSettings,
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
    /// Someone voted. Who they voted for stays secret until the reveal.
    #[serde(rename_all = "camelCase")]
    VoteCast {
        voter_id: PlayerId,
    },
    /// Drawing is over: here's the bamboozler and every vote. The bamboozler now gets to guess the word.
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
    AlreadyVoted,
    InvalidVote,
    NotBamboozler,
    /// Your seat was taken over by a newer connection with the same session token. Don't reconnect.
    Replaced,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PlayerSummary {
    pub id: PlayerId,
    pub name: String,
    pub score: u32,
    pub connected: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RoomSnapshot {
    pub code: String,
    pub host_id: Option<PlayerId>,
    pub players: Vec<PlayerSummary>,
    pub settings: RoomSettings,
    pub phase: PhaseView,
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
    Guessing {
        round: RoundView,
        reveal: Reveal,
    },
    #[serde(rename_all = "camelCase")]
    Finished {
        result: RoundResult,
    },
}

/// A round as one viewer may see it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RoundView {
    pub number: u32,
    pub category: String,
    /// Absent for the bamboozler and for host screens.
    pub word: Option<String>,
    /// Absent for host screens.
    pub role: Option<Role>,
    pub turn_order: Vec<PlayerId>,
    pub active_player_id: Option<PlayerId>,
    pub turn_remaining_ms: u32,
    pub round_remaining_ms: u32,
    pub strokes: Vec<StrokeView>,
    /// Who has voted already (not for whom).
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RoundResult {
    pub number: u32,
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
    }

    #[test]
    fn server_messages_are_tagged_camel_case_json() {
        let message = ServerMessage::TurnStarted {
            player_id: 2,
            duration_ms: 10_000,
        };
        let json = serde_json::to_value(&message).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "type": "turnStarted", "playerId": 2, "durationMs": 10000 })
        );
    }

    #[test]
    fn phase_views_are_tagged_by_phase() {
        let json = serde_json::to_value(PhaseView::Lobby).unwrap();
        assert_eq!(json, serde_json::json!({ "phase": "lobby" }));
    }
}
