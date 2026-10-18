//! One room's game: players, rounds, turns, strokes, votes and points. Pure logic without I/O: every method takes
//! the current time and returns the messages to send, so the rules are tested without sockets or real clocks.

mod guess;
pub mod task;
#[cfg(test)]
mod tests;

use std::{
    collections::HashSet,
    sync::Arc,
    time::{Duration, Instant},
};

use rand::{Rng, RngExt, SeedableRng, rngs::StdRng, seq::SliceRandom};

use crate::{
    limits,
    protocol::{
        Award, AwardReason, BrushSize, ClientMessage, PhaseView, PlayerId, PlayerSummary, Point, RejectReason, Reveal,
        Role, RoomSettings, RoomSnapshot, RoundResult, RoundView, ServerMessage, StrokeId, StrokeView, TurnMode, Vote,
    },
    words::WordLibrary,
};

/// Who a message is for.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Audience {
    Everyone,
    Player(PlayerId),
    Screens,
}

/// Who is looking at the room.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Viewer {
    Player(PlayerId),
    Screen,
}

pub type Outbox = Vec<(Audience, ServerMessage)>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Seat {
    pub player_id: PlayerId,
    pub session_token: String,
}

#[derive(Debug)]
struct Player {
    id: PlayerId,
    name: String,
    session_token: String,
    score: u32,
    connected: bool,
    disconnected_at: Option<Instant>,
}

#[derive(Debug)]
struct Stroke {
    id: StrokeId,
    player_id: PlayerId,
    colour: String,
    size: BrushSize,
    points: Vec<Point>,
    done: bool,
}

#[derive(Debug)]
struct Round {
    number: u32,
    category: String,
    word: String,
    bamboozler_id: PlayerId,
    turn_order: Vec<PlayerId>,
    turn_index: usize,
    turn_deadline: Instant,
    round_deadline: Instant,
    strokes: Vec<Stroke>,
    drawing_stroke: Option<usize>,
    strokes_this_turn: u32,
    point_count: usize,
    votes: Vec<Vote>,
}

#[derive(Debug)]
enum Phase {
    Lobby,
    Drawing(Round),
    Guessing { round: Round, guess_deadline: Instant },
    Finished(RoundResult),
}

pub struct Room {
    code: String,
    settings: RoomSettings,
    players: Vec<Player>,
    host_id: Option<PlayerId>,
    next_player_id: PlayerId,
    phase: Phase,
    rounds_played: u32,
    used_words: HashSet<String>,
    words: Arc<WordLibrary>,
    rng: StdRng,
}

impl Room {
    pub fn new(code: String, words: Arc<WordLibrary>, seed: u64) -> Self {
        Self {
            code,
            settings: RoomSettings::default(),
            players: Vec::new(),
            host_id: None,
            next_player_id: 1,
            phase: Phase::Lobby,
            rounds_played: 0,
            used_words: HashSet::new(),
            words,
            rng: StdRng::seed_from_u64(seed),
        }
    }

    pub fn code(&self) -> &str {
        &self.code
    }

    /// Takes a seat: back in your old one with a matching session token, otherwise a new one if the name is free.
    pub fn join(&mut self, name: &str, session_token: Option<&str>) -> Result<(Seat, Outbox), RejectReason> {
        if let Some(player) =
            session_token.and_then(|token| self.players.iter_mut().find(|player| player.session_token == token))
        {
            player.connected = true;
            player.disconnected_at = None;
            let seat = Seat {
                player_id: player.id,
                session_token: player.session_token.clone(),
            };
            let mut outbox = vec![(
                Audience::Everyone,
                ServerMessage::PlayerConnection {
                    player_id: seat.player_id,
                    connected: true,
                },
            )];
            self.ensure_host(&mut outbox);
            return Ok((seat, outbox));
        }

        let name = clean_name(name).ok_or(RejectReason::InvalidName)?;
        if self.players.len() >= limits::MAX_PLAYERS {
            return Err(RejectReason::RoomFull);
        }
        if self
            .players
            .iter()
            .any(|player| player.name.to_lowercase() == name.to_lowercase())
        {
            return Err(RejectReason::NameTaken);
        }

        let player = Player {
            id: self.next_player_id,
            name,
            session_token: new_token(&mut self.rng),
            score: 0,
            connected: true,
            disconnected_at: None,
        };
        self.next_player_id += 1;
        let seat = Seat {
            player_id: player.id,
            session_token: player.session_token.clone(),
        };
        let summary = summary(&player);
        self.players.push(player);

        let mut outbox = vec![(Audience::Everyone, ServerMessage::PlayerJoined { player: summary })];
        self.ensure_host(&mut outbox);
        Ok((seat, outbox))
    }

    pub fn disconnect(&mut self, player_id: PlayerId, now: Instant) -> Outbox {
        let Some(player) = self.player_mut(player_id) else {
            return Vec::new();
        };
        player.connected = false;
        player.disconnected_at = Some(now);

        let mut outbox = vec![(
            Audience::Everyone,
            ServerMessage::PlayerConnection {
                player_id,
                connected: false,
            },
        )];
        self.ensure_host(&mut outbox);

        if let Phase::Drawing(round) = &self.phase
            && round.turn_order.get(round.turn_index) == Some(&player_id)
        {
            outbox.extend(self.next_turn(now));
        }
        outbox
    }

    pub fn handle(&mut self, player_id: PlayerId, message: ClientMessage, now: Instant) -> Outbox {
        let result = match message {
            ClientMessage::UpdateSettings { settings } => self.update_settings(player_id, settings),
            ClientMessage::StartRound => self.start_round(player_id, now),
            ClientMessage::BeginStroke { colour, size, points } => {
                Ok(self.begin_stroke(player_id, colour, size, points))
            }
            ClientMessage::ExtendStroke { points } => Ok(self.extend_stroke(player_id, points)),
            ClientMessage::EndStroke => Ok(self.end_stroke(player_id, now)),
            ClientMessage::CastVote { suspect_id } => self.cast_vote(player_id, suspect_id, now),
            ClientMessage::GuessWord { guess } => self.guess_word(player_id, &guess, now),
            ClientMessage::Ping => Ok(vec![(Audience::Player(player_id), ServerMessage::Pong)]),
            ClientMessage::CreateRoom { .. } | ClientMessage::JoinRoom { .. } | ClientMessage::WatchRoom { .. } => {
                Err(RejectReason::AlreadyJoined)
            }
        };
        result.unwrap_or_else(|reason| vec![(Audience::Player(player_id), ServerMessage::Rejected { reason })])
    }

    /// Moves the game along when a deadline has passed, and frees seats of players who left between rounds.
    pub fn tick(&mut self, now: Instant) -> Outbox {
        let mut outbox = Vec::new();
        match &self.phase {
            Phase::Drawing(round) if now >= round.round_deadline => outbox.extend(self.reveal(now)),
            Phase::Drawing(round) if now >= round.turn_deadline => outbox.extend(self.next_turn(now)),
            Phase::Drawing(_) => {}
            Phase::Guessing { guess_deadline, .. } if now >= *guess_deadline => {
                outbox.extend(self.finish(None, now));
            }
            Phase::Guessing { .. } => {}
            Phase::Lobby | Phase::Finished(_) => outbox.extend(self.free_abandoned_seats(now)),
        }
        outbox.extend(self.reveal_if_everyone_voted(now));
        outbox
    }

    /// When `tick` next has something to do, at or after `now`.
    pub fn next_deadline(&self, now: Instant) -> Option<Instant> {
        match &self.phase {
            Phase::Drawing(round) => {
                let vote_grace_ends = self
                    .players
                    .iter()
                    .filter(|player| round.turn_order.contains(&player.id) && !has_voted(round, player.id))
                    .filter_map(|player| player.disconnected_at)
                    .map(|since| since + limits::VOTE_GRACE)
                    .filter(|ends| *ends > now);
                Some(vote_grace_ends.fold(round.turn_deadline.min(round.round_deadline), Instant::min))
            }
            Phase::Guessing { guess_deadline, .. } => Some(*guess_deadline),
            Phase::Lobby | Phase::Finished(_) => self
                .players
                .iter()
                .filter_map(|player| player.disconnected_at)
                .min()
                .map(|since| since + limits::SEAT_GRACE),
        }
    }

    pub fn snapshot(&self, viewer: Viewer, now: Instant) -> RoomSnapshot {
        let phase = match &self.phase {
            Phase::Lobby => PhaseView::Lobby,
            Phase::Drawing(round) => PhaseView::Drawing {
                round: self.round_view(round, viewer, now),
            },
            Phase::Guessing { round, guess_deadline } => PhaseView::Guessing {
                round: self.round_view(round, viewer, now),
                reveal: reveal_of(round, *guess_deadline, now),
            },
            Phase::Finished(result) => PhaseView::Finished { result: result.clone() },
        };
        RoomSnapshot {
            code: self.code.clone(),
            host_id: self.host_id,
            players: self.players.iter().map(summary).collect(),
            settings: self.settings.clone(),
            phase,
        }
    }

    fn update_settings(&mut self, player_id: PlayerId, settings: RoomSettings) -> Result<Outbox, RejectReason> {
        self.require_host(player_id)?;
        self.require_between_rounds()?;
        if !limits::ROUND_SECONDS.contains(&settings.round_seconds) || !self.words.has_language(settings.language) {
            return Err(RejectReason::InvalidSettings);
        }
        self.settings = settings.clone();
        Ok(vec![(Audience::Everyone, ServerMessage::SettingsChanged { settings })])
    }

    fn start_round(&mut self, player_id: PlayerId, now: Instant) -> Result<Outbox, RejectReason> {
        self.require_host(player_id)?;
        self.require_between_rounds()?;

        let mut turn_order: Vec<PlayerId> = self
            .players
            .iter()
            .filter(|player| player.connected)
            .map(|player| player.id)
            .collect();
        if turn_order.len() < limits::MIN_PLAYERS_TO_START {
            return Err(RejectReason::NotEnoughPlayers);
        }
        turn_order.shuffle(&mut self.rng);

        // Fully random every round: any rule about who it can't be ("not twice in a row") narrows it down.
        let bamboozler_id = turn_order[self.rng.random_range(0..turn_order.len())];

        let secret = self
            .words
            .pick(
                self.settings.language,
                self.settings.adults,
                &self.used_words,
                &mut self.rng,
            )
            .ok_or(RejectReason::InvalidSettings)?;
        self.used_words.insert(secret.word.clone());
        self.rounds_played += 1;

        let round = Round {
            number: self.rounds_played,
            category: secret.category,
            word: secret.word,
            bamboozler_id,
            turn_order,
            turn_index: 0,
            turn_deadline: now + self.turn_duration(),
            round_deadline: now + Duration::from_secs(self.settings.round_seconds.into()),
            strokes: Vec::new(),
            drawing_stroke: None,
            strokes_this_turn: 0,
            point_count: 0,
            votes: Vec::new(),
        };

        let mut outbox: Outbox = self
            .players
            .iter()
            .map(|player| {
                (
                    Audience::Player(player.id),
                    ServerMessage::RoundStarted {
                        round: self.round_view(&round, Viewer::Player(player.id), now),
                    },
                )
            })
            .collect();
        outbox.push((
            Audience::Screens,
            ServerMessage::RoundStarted {
                round: self.round_view(&round, Viewer::Screen, now),
            },
        ));
        self.phase = Phase::Drawing(round);
        Ok(outbox)
    }

    fn begin_stroke(&mut self, player_id: PlayerId, colour: String, size: BrushSize, points: Vec<Point>) -> Outbox {
        let mode = self.settings.mode;
        let Some(round) = self.drawing_round_for(player_id) else {
            tracing::debug!(player_id, "dropping stroke: not their turn");
            return Vec::new();
        };
        let turn_allows_another = match mode {
            TurnMode::Classic => round.strokes_this_turn == 0,
            TurnMode::Timed => round.strokes_this_turn < limits::STROKES_PER_TIMED_TURN,
        };
        if round.drawing_stroke.is_some() || !turn_allows_another || !is_colour(&colour) || points.is_empty() {
            tracing::debug!(player_id, "dropping stroke: not allowed now or malformed");
            return Vec::new();
        }
        let Some(points) = clean_points(points) else {
            tracing::debug!(player_id, "dropping stroke: points off the canvas or too many");
            return Vec::new();
        };
        if round.point_count + points.len() > limits::POINTS_PER_ROUND {
            tracing::debug!(player_id, "dropping stroke: round is full");
            return Vec::new();
        }
        round.point_count += points.len();

        let stroke = Stroke {
            id: u32::try_from(round.strokes.len()).unwrap_or(u32::MAX) + 1,
            player_id,
            colour,
            size,
            points,
            done: false,
        };
        let view = stroke_view(&stroke);
        round.drawing_stroke = Some(round.strokes.len());
        round.strokes.push(stroke);
        round.strokes_this_turn += 1;
        vec![(Audience::Everyone, ServerMessage::StrokeBegun { stroke: view })]
    }

    fn extend_stroke(&mut self, player_id: PlayerId, points: Vec<Point>) -> Outbox {
        let Some(round) = self.drawing_round_for(player_id) else {
            tracing::debug!(player_id, "dropping points: not their turn");
            return Vec::new();
        };
        let Some(index) = round.drawing_stroke else {
            tracing::debug!(player_id, "dropping points: no stroke in progress");
            return Vec::new();
        };
        let Some(points) = clean_points(points) else {
            tracing::debug!(player_id, "dropping points: off the canvas or too many");
            return Vec::new();
        };
        let stroke = &mut round.strokes[index];
        if points.is_empty()
            || stroke.points.len() + points.len() > limits::POINTS_PER_STROKE
            || round.point_count + points.len() > limits::POINTS_PER_ROUND
        {
            tracing::debug!(player_id, "dropping points: stroke or round is full");
            return Vec::new();
        }
        round.point_count += points.len();
        stroke.points.extend_from_slice(&points);
        vec![(
            Audience::Everyone,
            ServerMessage::StrokeExtended {
                stroke_id: stroke.id,
                points,
            },
        )]
    }

    fn end_stroke(&mut self, player_id: PlayerId, now: Instant) -> Outbox {
        let mode = self.settings.mode;
        let Some(round) = self.drawing_round_for(player_id) else {
            return Vec::new();
        };
        let mut outbox = finish_drawing_stroke(round);
        if mode == TurnMode::Classic && !outbox.is_empty() {
            outbox.extend(self.next_turn(now));
        }
        outbox
    }

    fn cast_vote(&mut self, voter_id: PlayerId, suspect_id: PlayerId, now: Instant) -> Result<Outbox, RejectReason> {
        let Phase::Drawing(round) = &mut self.phase else {
            return Err(RejectReason::WrongPhase);
        };
        if !round.turn_order.contains(&voter_id) || !round.turn_order.contains(&suspect_id) || voter_id == suspect_id {
            return Err(RejectReason::InvalidVote);
        }
        if round.votes.iter().any(|vote| vote.voter_id == voter_id) {
            return Err(RejectReason::AlreadyVoted);
        }
        round.votes.push(Vote { voter_id, suspect_id });
        let mut outbox = vec![(Audience::Everyone, ServerMessage::VoteCast { voter_id })];
        outbox.extend(self.reveal_if_everyone_voted(now));
        Ok(outbox)
    }

    fn guess_word(&mut self, player_id: PlayerId, guess: &str, now: Instant) -> Result<Outbox, RejectReason> {
        let Phase::Guessing { round, .. } = &self.phase else {
            return Err(RejectReason::WrongPhase);
        };
        if round.bamboozler_id != player_id {
            return Err(RejectReason::NotBamboozler);
        }
        let guess: String = guess.trim().chars().take(limits::GUESS_MAX_CHARS).collect();
        Ok(self.finish(Some(guess), now))
    }

    fn next_turn(&mut self, now: Instant) -> Outbox {
        let turn = self.turn_duration();
        let connected: HashSet<PlayerId> = self
            .players
            .iter()
            .filter(|player| player.connected)
            .map(|player| player.id)
            .collect();
        let Phase::Drawing(round) = &mut self.phase else {
            return Vec::new();
        };
        let mut outbox = finish_drawing_stroke(round);

        let count = round.turn_order.len();
        let next = (1..=count)
            .map(|step| (round.turn_index + step) % count)
            .find(|index| connected.contains(&round.turn_order[*index]))
            .unwrap_or((round.turn_index + 1) % count);
        round.turn_index = next;
        round.turn_deadline = now + turn;
        round.strokes_this_turn = 0;
        outbox.push((
            Audience::Everyone,
            ServerMessage::TurnStarted {
                player_id: round.turn_order[next],
                duration_ms: millis(turn),
            },
        ));
        outbox
    }

    fn reveal_if_everyone_voted(&mut self, now: Instant) -> Outbox {
        let Phase::Drawing(round) = &self.phase else {
            return Vec::new();
        };
        let still_in = |player: &Player| {
            player.connected
                || player
                    .disconnected_at
                    .is_some_and(|since| now < since + limits::VOTE_GRACE)
        };
        let everyone_voted = self
            .players
            .iter()
            .filter(|player| round.turn_order.contains(&player.id) && still_in(player))
            .all(|player| has_voted(round, player.id));
        if everyone_voted { self.reveal(now) } else { Vec::new() }
    }

    fn reveal(&mut self, now: Instant) -> Outbox {
        let Phase::Drawing(mut round) = std::mem::replace(&mut self.phase, Phase::Lobby) else {
            return Vec::new();
        };
        let mut outbox = finish_drawing_stroke(&mut round);
        let guess_deadline = now + limits::GUESS_TIME;
        outbox.push((
            Audience::Everyone,
            ServerMessage::Revealed {
                reveal: reveal_of(&round, guess_deadline, now),
            },
        ));
        self.phase = Phase::Guessing { round, guess_deadline };
        outbox
    }

    fn finish(&mut self, guess: Option<String>, now: Instant) -> Outbox {
        let Phase::Guessing { round, .. } = std::mem::replace(&mut self.phase, Phase::Lobby) else {
            return Vec::new();
        };
        let guess_correct = guess
            .as_deref()
            .is_some_and(|guess| guess::is_correct(guess, &round.word));
        let awards = score(&round, guess_correct);
        for award in &awards {
            if let Some(player) = self.player_mut(award.player_id) {
                player.score += award.points;
            }
        }
        let result = RoundResult {
            number: round.number,
            category: round.category,
            word: round.word,
            bamboozler_id: round.bamboozler_id,
            guess,
            guess_correct,
            votes: round.votes,
            awards,
            scores: self.players.iter().map(summary).collect(),
        };
        // The seat grace starts when the round ends, not when they dropped out during it.
        for player in &mut self.players {
            if player.disconnected_at.is_some() {
                player.disconnected_at = Some(now);
            }
        }
        self.phase = Phase::Finished(result.clone());
        vec![(Audience::Everyone, ServerMessage::RoundFinished { result })]
    }

    fn free_abandoned_seats(&mut self, now: Instant) -> Outbox {
        let abandoned: Vec<PlayerId> = self
            .players
            .iter()
            .filter(|player| {
                player
                    .disconnected_at
                    .is_some_and(|since| now >= since + limits::SEAT_GRACE)
            })
            .map(|player| player.id)
            .collect();
        self.players.retain(|player| !abandoned.contains(&player.id));
        let mut outbox: Outbox = abandoned
            .into_iter()
            .map(|player_id| (Audience::Everyone, ServerMessage::PlayerRemoved { player_id }))
            .collect();
        self.ensure_host(&mut outbox);
        outbox
    }

    /// The host is the earliest-joined connected player; it moves on when the host drops out.
    fn ensure_host(&mut self, outbox: &mut Outbox) {
        let host_is_here = self.host_id.is_some_and(|host_id| {
            self.players
                .iter()
                .any(|player| player.id == host_id && player.connected)
        });
        if host_is_here {
            return;
        }
        if let Some(player) = self.players.iter().find(|player| player.connected) {
            self.host_id = Some(player.id);
            outbox.push((Audience::Everyone, ServerMessage::HostChanged { host_id: player.id }));
        }
    }

    fn require_host(&self, player_id: PlayerId) -> Result<(), RejectReason> {
        if self.host_id == Some(player_id) {
            Ok(())
        } else {
            Err(RejectReason::NotHost)
        }
    }

    fn require_between_rounds(&self) -> Result<(), RejectReason> {
        match self.phase {
            Phase::Lobby | Phase::Finished(_) => Ok(()),
            _ => Err(RejectReason::WrongPhase),
        }
    }

    /// The round, if `player_id` is the one drawing right now.
    fn drawing_round_for(&mut self, player_id: PlayerId) -> Option<&mut Round> {
        match &mut self.phase {
            Phase::Drawing(round) if round.turn_order.get(round.turn_index) == Some(&player_id) => Some(round),
            _ => None,
        }
    }

    fn turn_duration(&self) -> Duration {
        match self.settings.mode {
            TurnMode::Classic => limits::CLASSIC_TURN,
            TurnMode::Timed => limits::TIMED_TURN,
        }
    }

    fn player_mut(&mut self, player_id: PlayerId) -> Option<&mut Player> {
        self.players.iter_mut().find(|player| player.id == player_id)
    }

    /// The word only ever goes to artists: never to the bamboozler (not even while they guess) or a host screen.
    fn round_view(&self, round: &Round, viewer: Viewer, now: Instant) -> RoundView {
        let (word, role, your_vote) = match viewer {
            Viewer::Screen => (None, None, None),
            Viewer::Player(player_id) if round.turn_order.contains(&player_id) => {
                let is_bamboozler = player_id == round.bamboozler_id;
                let word = (!is_bamboozler).then(|| round.word.clone());
                let role = if is_bamboozler { Role::Bamboozler } else { Role::Artist };
                let vote = round.votes.iter().find(|vote| vote.voter_id == player_id);
                (word, Some(role), vote.map(|vote| vote.suspect_id))
            }
            Viewer::Player(_) => (None, None, None),
        };
        RoundView {
            number: round.number,
            category: round.category.clone(),
            word,
            role,
            turn_order: round.turn_order.clone(),
            active_player_id: round.turn_order.get(round.turn_index).copied(),
            turn_remaining_ms: millis(round.turn_deadline.saturating_duration_since(now)),
            round_remaining_ms: millis(round.round_deadline.saturating_duration_since(now)),
            strokes: round.strokes.iter().map(stroke_view).collect(),
            voted: round.votes.iter().map(|vote| vote.voter_id).collect(),
            your_vote,
        }
    }
}

/// Points: +1 for every artist who voted for the bamboozler; the bamboozler gets +1 for guessing the word and +1
/// when fewer than half of the artists voted for them.
fn score(round: &Round, guess_correct: bool) -> Vec<Award> {
    let artists = round.turn_order.iter().filter(|id| **id != round.bamboozler_id).count();
    let mut awards: Vec<Award> = round
        .votes
        .iter()
        .filter(|vote| vote.suspect_id == round.bamboozler_id && vote.voter_id != round.bamboozler_id)
        .map(|vote| Award {
            player_id: vote.voter_id,
            reason: AwardReason::CaughtTheBamboozler,
            points: 1,
        })
        .collect();
    if guess_correct {
        awards.push(Award {
            player_id: round.bamboozler_id,
            reason: AwardReason::GuessedTheWord,
            points: 1,
        });
    }
    if awards
        .iter()
        .filter(|award| award.reason == AwardReason::CaughtTheBamboozler)
        .count()
        * 2
        < artists
    {
        awards.push(Award {
            player_id: round.bamboozler_id,
            reason: AwardReason::StayedHidden,
            points: 1,
        });
    }
    awards
}

fn has_voted(round: &Round, player_id: PlayerId) -> bool {
    round.votes.iter().any(|vote| vote.voter_id == player_id)
}

fn finish_drawing_stroke(round: &mut Round) -> Outbox {
    let Some(index) = round.drawing_stroke.take() else {
        return Vec::new();
    };
    let stroke = &mut round.strokes[index];
    stroke.done = true;
    vec![(Audience::Everyone, ServerMessage::StrokeEnded { stroke_id: stroke.id })]
}

fn reveal_of(round: &Round, guess_deadline: Instant, now: Instant) -> Reveal {
    Reveal {
        bamboozler_id: round.bamboozler_id,
        votes: round.votes.clone(),
        guess_remaining_ms: millis(guess_deadline.saturating_duration_since(now)),
    }
}

fn summary(player: &Player) -> PlayerSummary {
    PlayerSummary {
        id: player.id,
        name: player.name.clone(),
        score: player.score,
        connected: player.connected,
    }
}

fn stroke_view(stroke: &Stroke) -> StrokeView {
    StrokeView {
        id: stroke.id,
        player_id: stroke.player_id,
        colour: stroke.colour.clone(),
        size: stroke.size,
        points: stroke.points.clone(),
        done: stroke.done,
    }
}

/// Trims and collapses whitespace, drops control characters; `None` when empty or too long.
pub fn clean_name(name: &str) -> Option<String> {
    let name: String = name.chars().filter(|character| !character.is_control()).collect();
    let name = name.split_whitespace().collect::<Vec<_>>().join(" ");
    let length = name.chars().count();
    (1..=limits::NAME_MAX_CHARS).contains(&length).then_some(name)
}

fn is_colour(colour: &str) -> bool {
    colour.len() == 7 && colour.starts_with('#') && colour[1..].chars().all(|character| character.is_ascii_hexdigit())
}

/// Rejects a batch with any point outside the canvas, and rounds the rest to keep messages small.
fn clean_points(points: Vec<Point>) -> Option<Vec<Point>> {
    if points.len() > limits::POINTS_PER_MESSAGE {
        return None;
    }
    let in_range = |value: f32| value.is_finite() && (0.0..=1.0).contains(&value);
    points
        .into_iter()
        .map(|Point(x, y, pressure)| {
            (in_range(x) && in_range(y) && in_range(pressure)).then(|| Point(round4(x), round4(y), round4(pressure)))
        })
        .collect()
}

fn round4(value: f32) -> f32 {
    (value * 10_000.0).round() / 10_000.0
}

fn millis(duration: Duration) -> u32 {
    u32::try_from(duration.as_millis()).unwrap_or(u32::MAX)
}

fn new_token(rng: &mut impl Rng) -> String {
    (0..16).map(|_| format!("{:02x}", rng.random::<u8>())).collect()
}
