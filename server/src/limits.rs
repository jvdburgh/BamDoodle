//! Every limit the server enforces, in one place so they're easy to find and tune.

use std::time::Duration;

pub const MIN_PLAYERS_TO_START: usize = 3;
pub const MAX_PLAYERS: usize = 8;
pub const MAX_ROOMS: usize = 500;
pub const NAME_MAX_CHARS: usize = 20;
pub const GUESS_MAX_CHARS: usize = 40;

pub const LAPS: std::ops::RangeInclusive<u32> = 1..=5;
pub const TIMED_LAPS: u32 = 2;
pub const TURN_SECONDS: [u32; 4] = [10, 20, 30, 60];
pub const ROUNDS: std::ops::RangeInclusive<u32> = 1..=10;
pub const ONE_STROKE_TURN: Duration = Duration::from_secs(15);
pub const VOTE_TIME: Duration = Duration::from_secs(30);
pub const GUESS_TIME: Duration = Duration::from_secs(20);

pub const POINTS_PER_MESSAGE: usize = 128;
pub const POINTS_PER_STROKE: usize = 2_048;
pub const STROKES_PER_TIMED_TURN: u32 = 40;

/// A player who drops out between rounds keeps their seat (and score) this long.
pub const SEAT_GRACE: Duration = Duration::from_secs(120);
/// A room nobody is connected to is closed after this long.
pub const EMPTY_ROOM_GRACE: Duration = Duration::from_secs(300);

pub const MAX_MESSAGE_BYTES: usize = 16 * 1024;
pub const MESSAGES_PER_SECOND: u32 = 60;

/// A player who drops out during a round still counts for the vote this long, so a locked phone doesn't end it.
pub const VOTE_GRACE: Duration = Duration::from_secs(15);
/// All strokes in one round together, so one room can't eat the server's memory.
pub const POINTS_PER_ROUND: usize = 60_000;
pub const MAX_SCREENS: usize = 4;
/// A room that never seated anyone (a failed or abandoned create) closes this soon.
pub const UNUSED_ROOM_GRACE: Duration = Duration::from_secs(30);
/// How long a new connection may take to say which room it wants.
pub const HELLO_TIMEOUT: Duration = Duration::from_secs(10);
/// Messages queued for one connection before it counts as too slow and is dropped.
pub const OUTBOX_CAPACITY: usize = 256;
pub const ROOM_COMMAND_CAPACITY: usize = 256;
/// How often one player can change who they suspect; every change is announced to the whole room.
pub const SUSPICION_COOLDOWN: Duration = Duration::from_secs(1);
