//! One room's game: players, rounds, turns, strokes, suspicions, votes and points. Pure logic without I/O: every
//! method takes the current time and returns the messages to send, so the rules are tested without sockets or clocks.

mod guess;
pub mod task;
#[cfg(test)]
mod tests;

use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::{Duration, Instant},
};

use rand::{Rng, RngExt, SeedableRng, rngs::StdRng, seq::SliceRandom};

use crate::{
    limits,
    protocol::{
        Award, AwardReason, BrushSize, ClientMessage, PhaseView, PlayerId, PlayerSummary, Point, RejectReason, Reveal,
        Role, RoomSettings, RoomSnapshot, RoundResult, RoundView, ServerMessage, StrokeId, StrokeView, Suspicion,
        TurnMode, Vote,
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
    /// Turns over so far, skipped ones included; the drawing ends at `turns_per_player × players`.
    turns_taken: usize,
    turns_per_player: u32,
    turn_duration: Duration,
    turn_deadline: Instant,
    strokes: Vec<Stroke>,
    drawing_stroke: Option<usize>,
    strokes_this_turn: u32,
    point_count: usize,
    suspicions: Vec<Suspicion>,
    suspected_at: HashMap<PlayerId, Instant>,
    votes: Vec<Vote>,
}

#[derive(Debug)]
enum Phase {
    Lobby,
    Drawing(Round),
    Voting { round: Round, voting_deadline: Instant },
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
    /// Rounds played in the current game.
    rounds_played: u32,
    used_words: HashSet<String>,
    words: Arc<WordLibrary>,
    rng: StdRng,
}

impl Room {
    pub fn new(code: String, words: Arc<WordLibrary>, seed: u64) -> Self {
        let mut settings = RoomSettings::default();
        settings.categories = words.default_categories(settings.language);
        Self {
            code,
            settings,
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
            ClientMessage::Suspect { suspect_id } => self.suspect(player_id, suspect_id, now),
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
            Phase::Drawing(round) if now >= round.turn_deadline => outbox.extend(self.next_turn(now)),
            Phase::Voting { voting_deadline, .. } if now >= *voting_deadline => outbox.extend(self.reveal(now)),
            Phase::Guessing { guess_deadline, .. } if now >= *guess_deadline => {
                outbox.extend(self.finish(None, now));
            }
            Phase::Lobby | Phase::Finished(_) => outbox.extend(self.free_abandoned_seats(now)),
            Phase::Drawing(_) | Phase::Voting { .. } | Phase::Guessing { .. } => {}
        }
        outbox.extend(self.reveal_if_everyone_voted(now));
        outbox
    }

    /// When `tick` next has something to do, at or after `now`.
    pub fn next_deadline(&self, now: Instant) -> Option<Instant> {
        match &self.phase {
            Phase::Drawing(round) => Some(round.turn_deadline),
            Phase::Voting { round, voting_deadline } => {
                let vote_grace_ends = self
                    .players
                    .iter()
                    .filter(|player| round.turn_order.contains(&player.id) && !has_voted(round, player.id))
                    .filter_map(|player| player.disconnected_at)
                    .map(|since| since + limits::VOTE_GRACE)
                    .filter(|ends| *ends > now);
                Some(vote_grace_ends.fold(*voting_deadline, Instant::min))
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
            Phase::Voting { round, voting_deadline } => PhaseView::Voting {
                round: self.round_view(round, viewer, now),
                voting_remaining_ms: millis(voting_deadline.saturating_duration_since(now)),
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
            word_categories: self.words.catalogue(),
            phase,
        }
    }

    fn update_settings(&mut self, player_id: PlayerId, settings: RoomSettings) -> Result<Outbox, RejectReason> {
        self.require_host(player_id)?;
        self.require_between_rounds()?;
        let valid = limits::TURNS_PER_PLAYER.contains(&settings.turns_per_player)
            && limits::TURN_SECONDS.contains(&settings.turn_seconds)
            && limits::ROUNDS.contains(&settings.rounds)
            && self.words.has_categories(settings.language, &settings.categories);
        if !valid {
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
                &self.settings.categories,
                &self.used_words,
                &mut self.rng,
            )
            .ok_or(RejectReason::InvalidSettings)?;
        self.used_words.insert(secret.word.clone());

        let mut outbox = Vec::new();
        let new_game = match &self.phase {
            Phase::Lobby => true,
            // Not the frozen `game_over`: the host may have changed the number of rounds since.
            Phase::Finished(_) => self.rounds_played >= self.settings.rounds,
            _ => false,
        };
        if new_game {
            self.rounds_played = 0;
            for player in &mut self.players {
                player.score = 0;
            }
            outbox.push((
                Audience::Everyone,
                ServerMessage::GameStarted {
                    scores: self.players.iter().map(summary).collect(),
                },
            ));
        }
        self.rounds_played += 1;

        let (turns_per_player, turn_duration) = match self.settings.mode {
            TurnMode::OneStroke => (self.settings.turns_per_player, limits::ONE_STROKE_TURN),
            TurnMode::Timed => (
                limits::TIMED_TURNS_PER_PLAYER,
                Duration::from_secs(self.settings.turn_seconds.into()),
            ),
        };
        let round = Round {
            number: self.rounds_played,
            category: secret.category,
            word: secret.word,
            bamboozler_id,
            turn_order,
            turn_index: 0,
            turns_taken: 0,
            turns_per_player,
            turn_duration,
            turn_deadline: now + turn_duration,
            strokes: Vec::new(),
            drawing_stroke: None,
            strokes_this_turn: 0,
            point_count: 0,
            suspicions: Vec::new(),
            suspected_at: HashMap::new(),
            votes: Vec::new(),
        };

        outbox.extend(self.players.iter().map(|player| {
            (
                Audience::Player(player.id),
                ServerMessage::RoundStarted {
                    round: self.round_view(&round, Viewer::Player(player.id), now),
                },
            )
        }));
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
            TurnMode::OneStroke => round.strokes_this_turn == 0,
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
        if mode == TurnMode::OneStroke && !outbox.is_empty() {
            outbox.extend(self.next_turn(now));
        }
        outbox
    }

    fn suspect(
        &mut self,
        player_id: PlayerId,
        suspect_id: Option<PlayerId>,
        now: Instant,
    ) -> Result<Outbox, RejectReason> {
        let Phase::Drawing(round) = &mut self.phase else {
            return Err(RejectReason::WrongPhase);
        };
        let valid_suspect =
            suspect_id.is_none_or(|suspect_id| suspect_id != player_id && round.turn_order.contains(&suspect_id));
        if !round.turn_order.contains(&player_id) || !valid_suspect {
            return Err(RejectReason::InvalidVote);
        }
        let current = round
            .suspicions
            .iter()
            .find(|suspicion| suspicion.player_id == player_id)
            .map(|suspicion| suspicion.suspect_id);
        if current == suspect_id {
            return Ok(Vec::new());
        }
        if round
            .suspected_at
            .get(&player_id)
            .is_some_and(|at| now < *at + limits::SUSPICION_COOLDOWN)
        {
            tracing::debug!(player_id, "dropping suspicion: changed too recently");
            return Ok(Vec::new());
        }
        round.suspected_at.insert(player_id, now);
        round.suspicions.retain(|suspicion| suspicion.player_id != player_id);
        if let Some(suspect_id) = suspect_id {
            round.suspicions.push(Suspicion { player_id, suspect_id });
        }
        Ok(vec![(
            Audience::Everyone,
            ServerMessage::SuspicionChanged { player_id, suspect_id },
        )])
    }

    fn cast_vote(&mut self, voter_id: PlayerId, suspect_id: PlayerId, now: Instant) -> Result<Outbox, RejectReason> {
        let Phase::Voting { round, .. } = &mut self.phase else {
            return Err(RejectReason::WrongPhase);
        };
        if !round.turn_order.contains(&voter_id) || !round.turn_order.contains(&suspect_id) || voter_id == suspect_id {
            return Err(RejectReason::InvalidVote);
        }
        if has_voted(round, voter_id) {
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

    /// Ends the current turn: the next connected player draws, or after the last turn everyone votes.
    fn next_turn(&mut self, now: Instant) -> Outbox {
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
        let total = count * round.turns_per_player as usize;
        round.turns_taken += 1;
        while round.turns_taken < total && !connected.contains(&round.turn_order[round.turns_taken % count]) {
            round.turns_taken += 1;
        }
        if round.turns_taken >= total {
            outbox.extend(self.start_voting(now));
            return outbox;
        }

        round.turn_index = round.turns_taken % count;
        round.turn_deadline = now + round.turn_duration;
        round.strokes_this_turn = 0;
        outbox.push((
            Audience::Everyone,
            ServerMessage::TurnStarted {
                player_id: round.turn_order[round.turn_index],
                duration_ms: millis(round.turn_duration),
                turn: turn_of(round),
            },
        ));
        outbox
    }

    fn start_voting(&mut self, now: Instant) -> Outbox {
        let Phase::Drawing(mut round) = std::mem::replace(&mut self.phase, Phase::Lobby) else {
            return Vec::new();
        };
        let mut outbox = finish_drawing_stroke(&mut round);
        outbox.push((
            Audience::Everyone,
            ServerMessage::VotingStarted {
                duration_ms: millis(limits::VOTE_TIME),
            },
        ));
        self.phase = Phase::Voting {
            round,
            voting_deadline: now + limits::VOTE_TIME,
        };
        outbox
    }

    fn reveal_if_everyone_voted(&mut self, now: Instant) -> Outbox {
        let Phase::Voting { round, .. } = &self.phase else {
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

    /// Ends the vote. Whoever didn't submit votes for the player they suspected last, if anyone.
    fn reveal(&mut self, now: Instant) -> Outbox {
        let Phase::Voting { mut round, .. } = std::mem::replace(&mut self.phase, Phase::Lobby) else {
            return Vec::new();
        };
        let missing: Vec<Vote> = round
            .suspicions
            .iter()
            .filter(|suspicion| !has_voted(&round, suspicion.player_id))
            .map(|suspicion| Vote {
                voter_id: suspicion.player_id,
                suspect_id: suspicion.suspect_id,
            })
            .collect();
        round.votes.extend(missing);

        let guess_deadline = now + limits::GUESS_TIME;
        let outbox = vec![(
            Audience::Everyone,
            ServerMessage::Revealed {
                reveal: reveal_of(&round, guess_deadline, now),
            },
        )];
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
            rounds: self.settings.rounds,
            game_over: round.number >= self.settings.rounds,
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
        let drawing = round.turns_taken < round.turn_order.len() * round.turns_per_player as usize;
        RoundView {
            number: round.number,
            rounds: self.settings.rounds,
            category: round.category.clone(),
            word,
            role,
            turn_order: round.turn_order.clone(),
            active_player_id: drawing.then(|| round.turn_order[round.turn_index]),
            turn_remaining_ms: if drawing {
                millis(round.turn_deadline.saturating_duration_since(now))
            } else {
                0
            },
            turn: turn_of(round),
            turns_per_player: round.turns_per_player,
            strokes: round.strokes.iter().map(stroke_view).collect(),
            suspicions: round.suspicions.clone(),
            voted: round.votes.iter().map(|vote| vote.voter_id).collect(),
            your_vote,
        }
    }
}

/// Points: +1 for every artist whose final vote is the bamboozler; the bamboozler gets +1 for guessing the word and
/// +1 when fewer than half of the artists voted for them.
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
    let caught_by = awards
        .iter()
        .filter(|award| award.reason == AwardReason::CaughtTheBamboozler)
        .count();
    if caught_by * 2 < artists {
        awards.push(Award {
            player_id: round.bamboozler_id,
            reason: AwardReason::StayedHidden,
            points: 1,
        });
    }
    awards
}

/// The turn being drawn, 1-based and never past the last one.
fn turn_of(round: &Round) -> u32 {
    let turn = round.turns_taken / round.turn_order.len() + 1;
    u32::try_from(turn).unwrap_or(u32::MAX).min(round.turns_per_player)
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
