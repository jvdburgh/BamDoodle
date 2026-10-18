//! Anonymous usage events: one log line each, under the `bamdoodle::usage` target, counted in Scaleway Cockpit
//! ([decision 0005](../../docs/decisions/0005-usage-and-errors.md)). They carry counts and settings only: never a
//! name, a room code, a word, a guess or anything else that points at a person or a game.

use std::time::Duration;

use crate::protocol::{Language, RoomSettings, RoundResult, TurnMode};

/// The `target` of every usage event, so Cockpit can select them: `{...} | json | target="bamdoodle::usage"`.
pub const TARGET: &str = "bamdoodle::usage";

/// Why a room's task ended.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Closed {
    /// Nobody ever sat down.
    Unused,
    /// Everyone left.
    Empty,
    /// Nobody played for `ROOM_IDLE_LIMIT`.
    Idle,
}

pub fn room_created(open_rooms: usize) {
    tracing::info!(target: TARGET, event = "room_created", open_rooms);
}

pub fn round_finished(result: &RoundResult, settings: &RoomSettings, players: usize) {
    let artists = players.saturating_sub(1);
    let caught = result
        .votes
        .iter()
        .filter(|vote| vote.voter_id != result.bamboozler_id && vote.suspect_id == result.bamboozler_id)
        .count();
    tracing::info!(
        target: TARGET,
        event = "round_finished",
        round = result.number,
        rounds = result.rounds,
        game_over = result.game_over,
        players,
        caught,
        caught_by_all = artists > 0 && caught == artists,
        guessed = result.guess_correct,
        mode = match settings.mode {
            TurnMode::OneStroke => "one_stroke",
            TurnMode::Timed => "timed",
        },
        turns_per_player = settings.turns_per_player,
        turn_seconds = settings.turn_seconds,
        language = match settings.language {
            Language::En => "en",
            Language::Nl => "nl",
        },
        categories = settings.categories.len(),
    );
}

pub fn room_closed(closed: Closed, open_for: Duration) {
    let reason = match closed {
        Closed::Unused => "unused",
        Closed::Empty => "empty",
        Closed::Idle => "idle",
    };
    tracing::info!(target: TARGET, event = "room_closed", reason, minutes_open = open_for.as_secs() / 60);
}
