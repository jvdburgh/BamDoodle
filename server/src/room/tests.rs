use std::collections::BTreeMap;

use super::*;
use crate::{protocol::Language, words::WordPack};

const WORDS: [&str; 3] = ["lighthouse", "giraffe", "pancake"];

fn library() -> Arc<WordLibrary> {
    Arc::new(WordLibrary::new(vec![
        WordPack {
            language: Language::En,
            adult: false,
            categories: BTreeMap::from([("Things".into(), WORDS.iter().map(|word| word.to_string()).collect())]),
        },
        WordPack {
            language: Language::Nl,
            adult: false,
            categories: BTreeMap::from([("Dingen".into(), vec!["vuurtoren".into()])]),
        },
    ]))
}

struct Game {
    room: Room,
    now: Instant,
    seats: Vec<Seat>,
}

impl Game {
    fn with_players(count: usize) -> Self {
        Self::with_library(count, library())
    }

    fn with_library(count: usize, words: Arc<WordLibrary>) -> Self {
        let mut room = Room::new("BKTZ".into(), words, 7);
        let names = ["Sam", "Noor", "Jip", "Max", "Ada", "Bo", "Cas", "Dex"];
        let seats = names[..count]
            .iter()
            .map(|name| room.join(name, None, Instant::now()).unwrap().0)
            .collect();
        Self {
            room,
            now: Instant::now(),
            seats,
        }
    }

    fn started(count: usize) -> Self {
        let mut game = Self::with_players(count);
        let outbox = game.send(game.host(), ClientMessage::StartRound);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::RoundStarted { .. }
        )));
        game
    }

    /// A started round, already past the drawing and into the final vote.
    fn voting(count: usize) -> Self {
        let mut game = Self::started(count);
        game.finish_drawing();
        game
    }

    fn host(&self) -> PlayerId {
        self.seats[0].player_id
    }

    fn send(&mut self, player_id: PlayerId, message: ClientMessage) -> Outbox {
        self.room.handle(player_id, message, self.now)
    }

    fn advance(&mut self, duration: Duration) -> Outbox {
        self.now += duration;
        self.room.tick(self.now)
    }

    /// Lets every remaining turn run out.
    fn finish_drawing(&mut self) -> Outbox {
        let mut outbox = Vec::new();
        while let Phase::Drawing(round) = &self.room.phase {
            let turn = round.turn_duration;
            outbox.extend(self.advance(turn));
        }
        outbox
    }

    /// Plays a round to the end: drawing and voting time out, no guess.
    fn finish_round(&mut self) {
        self.finish_drawing();
        self.advance(limits::VOTE_TIME);
        self.advance(limits::GUESS_TIME);
        assert!(matches!(self.room.phase, Phase::Finished(_)));
    }

    fn round(&self) -> &Round {
        match &self.room.phase {
            Phase::Drawing(round) | Phase::Voting { round, .. } | Phase::Guessing { round, .. } => round,
            phase => panic!("no round in {phase:?}"),
        }
    }

    fn active(&self) -> PlayerId {
        let round = self.round();
        round.turn_order[round.turn_index]
    }

    fn bamboozler(&self) -> PlayerId {
        self.round().bamboozler_id
    }

    fn artists(&self) -> Vec<PlayerId> {
        let round = self.round();
        round
            .turn_order
            .iter()
            .copied()
            .filter(|id| *id != round.bamboozler_id)
            .collect()
    }

    fn draw_a_stroke(&mut self) -> Outbox {
        let active = self.active();
        let mut outbox = self.send(active, begin(&[Point(0.1, 0.1, 0.5)]));
        outbox.extend(self.send(
            active,
            ClientMessage::ExtendStroke {
                points: vec![Point(0.2, 0.2, 0.5)],
            },
        ));
        outbox.extend(self.send(active, ClientMessage::EndStroke));
        outbox
    }

    fn everyone_votes_for(&mut self, suspect: impl Fn(PlayerId) -> PlayerId) -> Outbox {
        let voters = self.round().turn_order.clone();
        voters
            .into_iter()
            .flat_map(|voter| {
                self.send(
                    voter,
                    ClientMessage::CastVote {
                        suspect_id: suspect(voter),
                    },
                )
            })
            .collect()
    }
}

fn begin(points: &[Point]) -> ClientMessage {
    ClientMessage::BeginStroke {
        colour: "#f13866".into(),
        size: BrushSize::Medium,
        points: points.to_vec(),
    }
}

fn rejected(outbox: &Outbox) -> Option<RejectReason> {
    outbox.iter().find_map(|(_, message)| match message {
        ServerMessage::Rejected { reason } => Some(*reason),
        _ => None,
    })
}

fn has(outbox: &Outbox, predicate: impl Fn(&ServerMessage) -> bool) -> bool {
    outbox.iter().any(|(_, message)| predicate(message))
}

fn sent_to(outbox: &Outbox, player_id: PlayerId) -> Vec<&ServerMessage> {
    outbox
        .iter()
        .filter(|(audience, _)| matches!(audience, Audience::Everyone) || *audience == Audience::Player(player_id))
        .map(|(_, message)| message)
        .collect()
}

fn other_than(order: &[PlayerId], voter: PlayerId) -> PlayerId {
    *order.iter().find(|id| **id != voter).unwrap()
}

mod seats {
    use super::*;

    #[test]
    fn first_player_hosts_and_everyone_hears_about_joins() {
        let mut room = Room::new("BKTZ".into(), library(), 1);
        let (sam, outbox) = room.join("Sam", None, Instant::now()).unwrap();
        assert!(has(
            &outbox,
            |message| matches!(message, ServerMessage::HostChanged { host_id } if *host_id == sam.player_id)
        ));

        let (_, outbox) = room.join("Noor", None, Instant::now()).unwrap();
        assert!(has(
            &outbox,
            |message| matches!(message, ServerMessage::PlayerJoined { player } if player.name == "Noor")
        ));
        assert_eq!(room.host_id, Some(sam.player_id));
    }

    #[test]
    fn names_are_tidied_unique_and_short() {
        let mut room = Room::new("BKTZ".into(), library(), 1);
        let (seat, _) = room.join("  Sam \n  van   Dam ", None, Instant::now()).unwrap();
        assert_eq!(room.players[0].name, "Sam van Dam");
        assert_eq!(seat.session_token.len(), 32);

        assert_eq!(
            room.join("sam VAN dam", None, Instant::now()).unwrap_err(),
            RejectReason::NameTaken
        );
        assert_eq!(
            room.join("   ", None, Instant::now()).unwrap_err(),
            RejectReason::InvalidName
        );
        assert_eq!(
            room.join(&"x".repeat(21), None, Instant::now()).unwrap_err(),
            RejectReason::InvalidName
        );
        assert!(room.join(&"x".repeat(20), None, Instant::now()).is_ok());
    }

    #[test]
    fn the_room_is_full_at_eight() {
        let mut game = Game::with_players(8);
        assert_eq!(
            game.room.join("Eve", None, game.now).unwrap_err(),
            RejectReason::RoomFull
        );
    }

    #[test]
    fn a_session_token_takes_back_the_seat_and_score() {
        let mut game = Game::with_players(3);
        let noor = game.seats[1].clone();
        game.room.players[1].score = 4;
        game.room.disconnect(noor.player_id, game.now);

        let (seat, outbox) = game
            .room
            .join("someone else", Some(&noor.session_token), game.now)
            .unwrap();
        assert_eq!(seat, noor);
        assert_eq!(game.room.players[1].score, 4);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::PlayerConnection { connected: true, .. }
        )));
    }

    #[test]
    fn an_unknown_session_token_just_joins_as_new() {
        let mut room = Room::new("BKTZ".into(), library(), 1);
        let (seat, _) = room.join("Sam", Some("not-a-token"), Instant::now()).unwrap();
        assert_ne!(seat.session_token, "not-a-token");
    }

    #[test]
    fn the_host_role_moves_on_when_the_host_stays_away() {
        let mut game = Game::with_players(3);
        let host = game.host();
        let outbox = game.room.disconnect(host, game.now);
        assert!(!has(&outbox, |message| matches!(
            message,
            ServerMessage::HostChanged { .. }
        )));
        assert_eq!(game.room.next_deadline(game.now), Some(game.now + limits::HOST_GRACE));

        let outbox = game.advance(limits::HOST_GRACE);
        let noor = game.seats[1].player_id;
        assert!(has(
            &outbox,
            |message| matches!(message, ServerMessage::HostChanged { host_id } if *host_id == noor)
        ));
    }

    #[test]
    fn the_host_grace_doesnt_restart_when_a_round_ends() {
        let mut game = Game::started(3);
        let host = game.host();
        game.finish_drawing();
        game.advance(limits::VOTE_TIME);
        game.room.disconnect(host, game.now);
        game.advance(limits::HOST_GRACE - Duration::from_secs(5));
        game.advance(limits::GUESS_TIME);
        assert!(matches!(game.room.phase, Phase::Finished(_)));
        assert_ne!(
            game.room.host_id,
            Some(host),
            "the grace counts from the drop, not from the round's end"
        );
    }

    #[test]
    fn a_host_who_refreshes_keeps_the_role() {
        let mut game = Game::with_players(3);
        let host = game.seats[0].clone();
        game.room.disconnect(host.player_id, game.now);
        game.advance(limits::HOST_GRACE / 2);
        let (_, outbox) = game.room.join("Sam", Some(&host.session_token), game.now).unwrap();
        assert!(!has(&outbox, |message| matches!(
            message,
            ServerMessage::HostChanged { .. }
        )));

        let outbox = game.advance(limits::HOST_GRACE);
        assert!(!has(&outbox, |message| matches!(
            message,
            ServerMessage::HostChanged { .. }
        )));
        assert_eq!(game.room.host_id, Some(host.player_id));
    }

    #[test]
    fn a_room_whose_host_is_long_gone_gets_a_new_host_when_someone_comes_back() {
        let mut game = Game::with_players(3);
        let tokens: Vec<Seat> = game.seats.clone();
        for seat in &tokens {
            game.room.disconnect(seat.player_id, game.now);
        }
        game.advance(limits::HOST_GRACE * 2);
        let (_, outbox) = game
            .room
            .join("Noor", Some(&tokens[1].session_token), game.now)
            .unwrap();
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::HostChanged { host_id } if *host_id == tokens[1].player_id
        )));
    }

    #[test]
    fn the_seat_grace_starts_when_the_round_ends() {
        let mut game = Game::started(4);
        let gone = game.round().turn_order[3];
        game.room.disconnect(gone, game.now);
        game.advance(Duration::from_secs(600));
        game.finish_round();
        assert!(
            game.room.players.iter().any(|player| player.id == gone),
            "still seated right after the round"
        );

        game.advance(limits::SEAT_GRACE);
        assert!(!game.room.players.iter().any(|player| player.id == gone));
    }

    #[test]
    fn seats_of_players_who_left_between_rounds_are_freed_after_a_while() {
        let mut game = Game::with_players(3);
        let jip = game.seats[2].player_id;
        game.room.disconnect(jip, game.now);
        assert_eq!(game.room.next_deadline(game.now), Some(game.now + limits::SEAT_GRACE));

        assert!(game.advance(limits::SEAT_GRACE - Duration::from_secs(1)).is_empty());
        let outbox = game.advance(Duration::from_secs(1));
        assert!(has(
            &outbox,
            |message| matches!(message, ServerMessage::PlayerRemoved { player_id } if *player_id == jip)
        ));
        assert_eq!(game.room.players.len(), 2);
    }
}

mod settings {
    use super::*;

    #[test]
    fn only_the_host_changes_settings_between_rounds() {
        let mut game = Game::with_players(3);
        let settings = RoomSettings {
            mode: TurnMode::Timed,
            turns_per_player: 2,
            turn_seconds: 30,
            rounds: 3,
            language: Language::Nl,
            categories: vec!["Dingen".into()],
        };
        let noor = game.seats[1].player_id;
        let outbox = game.send(
            noor,
            ClientMessage::UpdateSettings {
                settings: settings.clone(),
            },
        );
        assert_eq!(rejected(&outbox), Some(RejectReason::NotHost));

        let outbox = game.send(
            game.host(),
            ClientMessage::UpdateSettings {
                settings: settings.clone(),
            },
        );
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::SettingsChanged { .. }
        )));
        assert_eq!(game.room.settings, settings);
    }

    #[test]
    fn settings_are_checked() {
        let mut game = Game::with_players(3);
        for settings in [
            RoomSettings {
                turns_per_player: 0,
                ..game.room.settings.clone()
            },
            RoomSettings {
                turns_per_player: 6,
                ..game.room.settings.clone()
            },
            RoomSettings {
                turn_seconds: 15,
                ..game.room.settings.clone()
            },
            RoomSettings {
                rounds: 0,
                ..game.room.settings.clone()
            },
            RoomSettings {
                rounds: 11,
                ..game.room.settings.clone()
            },
            RoomSettings {
                categories: Vec::new(),
                ..game.room.settings.clone()
            },
            RoomSettings {
                categories: vec!["Dingen".into()],
                ..game.room.settings.clone()
            },
            RoomSettings {
                categories: vec!["Things".into(), "Things".into()],
                ..game.room.settings.clone()
            },
        ] {
            let outbox = game.send(game.host(), ClientMessage::UpdateSettings { settings });
            assert_eq!(rejected(&outbox), Some(RejectReason::InvalidSettings));
        }
    }

    #[test]
    fn settings_are_locked_during_a_round() {
        let mut game = Game::started(3);
        let outbox = game.send(
            game.host(),
            ClientMessage::UpdateSettings {
                settings: RoomSettings::default(),
            },
        );
        assert_eq!(rejected(&outbox), Some(RejectReason::WrongPhase));
    }
}

mod starting {
    use super::*;

    #[test]
    fn only_the_host_starts_with_three_connected_players() {
        let mut game = Game::with_players(3);
        let noor = game.seats[1].player_id;
        assert_eq!(
            rejected(&game.send(noor, ClientMessage::StartRound)),
            Some(RejectReason::NotHost)
        );

        game.room.disconnect(game.seats[2].player_id, game.now);
        assert_eq!(
            rejected(&game.send(game.host(), ClientMessage::StartRound)),
            Some(RejectReason::NotEnoughPlayers)
        );
    }

    #[test]
    fn one_bamboozler_and_only_artists_get_the_word() {
        let mut game = Game::with_players(4);
        let outbox = game.send(game.host(), ClientMessage::StartRound);
        let word = game.round().word.clone();
        let bamboozler = game.bamboozler();

        let views: Vec<(Audience, &RoundView)> = outbox
            .iter()
            .filter_map(|(audience, message)| match message {
                ServerMessage::RoundStarted { round } => Some((*audience, round)),
                _ => None,
            })
            .collect();
        assert_eq!(views.len(), 5, "one per player and one for screens");
        for (audience, view) in views {
            match audience {
                Audience::Player(id) if id == bamboozler => {
                    assert_eq!(view.role, Some(Role::Bamboozler));
                    assert_eq!(view.word, None);
                }
                Audience::Player(_) => {
                    assert_eq!(view.role, Some(Role::Artist));
                    assert_eq!(view.word.as_deref(), Some(word.as_str()));
                }
                Audience::Screens => assert_eq!((view.role, view.word.as_deref()), (None, None)),
                Audience::Everyone => panic!("the round start is never broadcast"),
            }
            assert_eq!(view.category, "Things");
            assert_eq!(
                (view.number, view.rounds, view.turn, view.turns_per_player),
                (1, 5, 1, 3)
            );
            assert_eq!(view.active_player_id, Some(view.turn_order[0]));
        }
    }

    #[test]
    fn the_bamboozler_never_receives_the_word_until_the_round_is_over() {
        let mut game = Game::with_players(4);
        let mut outbox = game.send(game.host(), ClientMessage::StartRound);
        let bamboozler = game.bamboozler();
        let word = game.round().word.clone();
        outbox.extend(game.draw_a_stroke());
        outbox.extend(game.finish_drawing());
        let order = game.round().turn_order.clone();
        outbox.extend(game.everyone_votes_for(|voter| {
            if voter == bamboozler {
                other_than(&order, voter)
            } else {
                bamboozler
            }
        }));
        let snapshot = game.room.snapshot(Viewer::Player(bamboozler), game.now);
        assert!(matches!(snapshot.phase, PhaseView::Guessing { .. }));

        let seen =
            serde_json::to_string(&sent_to(&outbox, bamboozler)).unwrap() + &serde_json::to_string(&snapshot).unwrap();
        assert!(!seen.contains(&word), "the bamboozler saw the word");

        let screen = serde_json::to_string(&game.room.snapshot(Viewer::Screen, game.now)).unwrap();
        assert!(!screen.contains(&word), "a host screen saw the word");
    }

    #[test]
    fn the_next_round_picks_a_new_word() {
        let mut game = Game::started(3);
        let first = game.round().word.clone();
        game.finish_round();

        game.send(game.host(), ClientMessage::StartRound);
        assert_ne!(game.round().word, first);
        assert_eq!(game.round().number, 2);
    }
}

mod game {
    use super::*;

    #[test]
    fn a_game_ends_after_its_rounds_and_the_next_start_begins_a_new_one() {
        let mut game = Game::with_players(3);
        game.room.settings.rounds = 2;
        let outbox = game.send(game.host(), ClientMessage::StartRound);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::GameStarted { .. }
        )));
        game.finish_round();
        let Phase::Finished(result) = &game.room.phase else {
            panic!()
        };
        assert_eq!((result.number, result.rounds, result.game_over), (1, 2, false));

        let outbox = game.send(game.host(), ClientMessage::StartRound);
        assert!(!has(&outbox, |message| matches!(
            message,
            ServerMessage::GameStarted { .. }
        )));
        game.room.players[0].score = 3;
        game.finish_round();
        let Phase::Finished(result) = &game.room.phase else {
            panic!()
        };
        assert!(result.game_over);

        let outbox = game.send(game.host(), ClientMessage::StartRound);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::GameStarted { scores } if scores.iter().all(|player| player.score == 0)
        )));
        assert_eq!(game.round().number, 1);
    }
}

mod drawing {
    use super::*;

    #[test]
    fn only_the_active_player_draws() {
        let mut game = Game::started(3);
        let someone_else = game.round().turn_order[1];
        assert!(game.send(someone_else, begin(&[Point(0.5, 0.5, 0.5)])).is_empty());
        assert!(game.round().strokes.is_empty());
    }

    #[test]
    fn a_stroke_is_broadcast_as_it_is_drawn() {
        let mut game = Game::started(3);
        let active = game.active();
        let outbox = game.draw_a_stroke();
        let stroke = &game.round().strokes[0];
        assert_eq!(stroke.player_id, active);
        assert_eq!(stroke.points, vec![Point(0.1, 0.1, 0.5), Point(0.2, 0.2, 0.5)]);
        assert!(stroke.done);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::StrokeBegun { .. }
        )));
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::StrokeExtended { .. }
        )));
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::StrokeEnded { .. }
        )));
    }

    #[test]
    fn one_stroke_turns_end_after_one_stroke() {
        let mut game = Game::started(3);
        let first = game.active();
        let outbox = game.draw_a_stroke();
        assert_ne!(game.active(), first);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::TurnStarted { player_id, turn: 1, .. } if *player_id == game.active()
        )));
    }

    #[test]
    fn the_drawing_lasts_the_chosen_turns_then_everyone_votes() {
        let mut game = Game::with_players(3);
        game.room.settings.turns_per_player = 2;
        game.send(game.host(), ClientMessage::StartRound);
        let mut turns_seen = Vec::new();
        for _ in 0..5 {
            let outbox = game.draw_a_stroke();
            turns_seen.extend(outbox.iter().filter_map(|(_, message)| match message {
                ServerMessage::TurnStarted { turn, .. } => Some(*turn),
                _ => None,
            }));
        }
        assert_eq!(turns_seen, vec![1, 1, 2, 2, 2]);
        assert!(matches!(game.room.phase, Phase::Drawing(_)));

        let outbox = game.draw_a_stroke();
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::VotingStarted { duration_ms: 30_000 }
        )));
        assert!(matches!(game.room.phase, Phase::Voting { .. }));
        assert_eq!(game.round().strokes.len(), 6);
    }

    #[test]
    fn timed_turns_last_the_chosen_seconds_twice_each() {
        let mut game = Game::with_players(3);
        game.room.settings.mode = TurnMode::Timed;
        game.room.settings.turn_seconds = 30;
        game.send(game.host(), ClientMessage::StartRound);
        let first = game.active();
        game.draw_a_stroke();
        game.draw_a_stroke();
        assert_eq!(game.active(), first);
        assert_eq!(game.round().strokes.len(), 2);

        assert!(game.advance(Duration::from_secs(29)).is_empty());
        let outbox = game.advance(Duration::from_secs(1));
        assert_ne!(game.active(), first);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::TurnStarted {
                duration_ms: 30_000,
                ..
            }
        )));

        for _ in 0..4 {
            game.advance(Duration::from_secs(30));
        }
        assert!(matches!(game.room.phase, Phase::Drawing(_)));
        game.advance(Duration::from_secs(30));
        assert!(matches!(game.room.phase, Phase::Voting { .. }));
    }

    #[test]
    fn a_turn_passes_when_its_time_runs_out_and_ends_the_stroke() {
        let mut game = Game::started(3);
        let first = game.active();
        game.send(first, begin(&[Point(0.5, 0.5, 0.5)]));
        assert_eq!(
            game.room.next_deadline(game.now),
            Some(game.now + limits::ONE_STROKE_TURN)
        );

        let outbox = game.advance(limits::ONE_STROKE_TURN);
        assert_ne!(game.active(), first);
        assert!(game.round().strokes[0].done);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::StrokeEnded { .. }
        )));
    }

    #[test]
    fn strokes_off_the_canvas_or_with_odd_colours_are_dropped() {
        let mut game = Game::started(3);
        let active = game.active();
        assert!(game.send(active, begin(&[Point(1.2, 0.5, 0.5)])).is_empty());
        assert!(game.send(active, begin(&[Point(f32::NAN, 0.5, 0.5)])).is_empty());
        assert!(game.send(active, begin(&[])).is_empty());
        let red = ClientMessage::BeginStroke {
            colour: "red".into(),
            size: BrushSize::Fine,
            points: vec![Point(0.5, 0.5, 0.5)],
        };
        assert!(game.send(active, red).is_empty());
        let too_many = vec![Point(0.5, 0.5, 0.5); limits::POINTS_PER_MESSAGE + 1];
        assert!(game.send(active, begin(&too_many)).is_empty());
        assert!(game.round().strokes.is_empty());
    }

    #[test]
    fn points_are_rounded_to_keep_messages_small() {
        let mut game = Game::started(3);
        let active = game.active();
        game.send(active, begin(&[Point(0.123_456, 0.5, 0.5)]));
        assert_eq!(game.round().strokes[0].points[0].0, 0.1235);
    }

    #[test]
    fn a_stroke_has_a_maximum_length() {
        let mut game = Game::started(3);
        let active = game.active();
        game.send(active, begin(&[Point(0.5, 0.5, 0.5)]));
        let batch = vec![Point(0.5, 0.5, 0.5); limits::POINTS_PER_MESSAGE];
        let accepted = (0..100)
            .filter(|_| {
                !game
                    .send(active, ClientMessage::ExtendStroke { points: batch.clone() })
                    .is_empty()
            })
            .count();
        assert_eq!(accepted, (limits::POINTS_PER_STROKE - 1) / limits::POINTS_PER_MESSAGE);
    }

    #[test]
    fn a_round_has_a_maximum_number_of_points() {
        let mut game = Game::started(3);
        let active = game.active();
        if let Phase::Drawing(round) = &mut game.room.phase {
            round.point_count = limits::POINTS_PER_ROUND - 1;
        }
        assert!(
            game.send(active, begin(&[Point(0.5, 0.5, 0.5), Point(0.6, 0.6, 0.5)]))
                .is_empty()
        );
        assert!(!game.send(active, begin(&[Point(0.5, 0.5, 0.5)])).is_empty());
    }

    #[test]
    fn a_disconnected_player_is_skipped_and_their_turn_still_counts() {
        let mut game = Game::with_players(3);
        game.room.settings.turns_per_player = 1;
        game.send(game.host(), ClientMessage::StartRound);
        let second = game.round().turn_order[1];
        game.room.disconnect(second, game.now);
        game.draw_a_stroke();
        assert_eq!(game.active(), game.round().turn_order[2]);

        let outbox = game.draw_a_stroke();
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::VotingStarted { .. }
        )));
    }

    #[test]
    fn a_disconnected_drawer_loses_their_turn() {
        let mut game = Game::started(4);
        let first = game.active();
        game.room.disconnect(first, game.now);
        assert_ne!(game.active(), first);
    }
}

mod suspecting {
    use super::*;

    #[test]
    fn suspicions_are_public_and_can_change() {
        let mut game = Game::started(4);
        let [sam, noor, jip, ..] = game.round().turn_order[..] else {
            panic!()
        };

        let outbox = game.send(sam, ClientMessage::Suspect { suspect_id: Some(noor) });
        assert_eq!(
            outbox,
            vec![(
                Audience::Everyone,
                ServerMessage::SuspicionChanged {
                    player_id: sam,
                    suspect_id: Some(noor)
                }
            )]
        );
        game.now += limits::SUSPICION_COOLDOWN;
        game.send(sam, ClientMessage::Suspect { suspect_id: Some(jip) });
        assert!(
            game.send(sam, ClientMessage::Suspect { suspect_id: Some(jip) })
                .is_empty(),
            "no news, no message"
        );
        assert_eq!(
            game.round().suspicions,
            vec![Suspicion {
                player_id: sam,
                suspect_id: jip
            }]
        );

        let view = game.room.snapshot(Viewer::Screen, game.now);
        let PhaseView::Drawing { round } = view.phase else {
            panic!()
        };
        assert_eq!(round.suspicions.len(), 1, "everyone, screens too, sees suspicions");

        game.now += limits::SUSPICION_COOLDOWN;
        game.send(sam, ClientMessage::Suspect { suspect_id: None });
        assert!(game.round().suspicions.is_empty());
    }

    #[test]
    fn you_cant_suspect_yourself_or_outsiders() {
        let mut game = Game::started(3);
        let sam = game.round().turn_order[0];
        let outbox = game.send(sam, ClientMessage::Suspect { suspect_id: Some(sam) });
        assert_eq!(rejected(&outbox), Some(RejectReason::InvalidVote));
        let outbox = game.send(sam, ClientMessage::Suspect { suspect_id: Some(99) });
        assert_eq!(rejected(&outbox), Some(RejectReason::InvalidVote));
    }

    #[test]
    fn suspecting_is_for_while_the_drawing_goes_on() {
        let mut game = Game::voting(3);
        let [sam, noor, ..] = game.round().turn_order[..] else {
            panic!()
        };
        let outbox = game.send(sam, ClientMessage::Suspect { suspect_id: Some(noor) });
        assert_eq!(rejected(&outbox), Some(RejectReason::WrongPhase));
    }
}

mod voting {
    use super::*;

    #[test]
    fn the_final_vote_only_happens_after_the_drawing() {
        let mut game = Game::started(3);
        let [sam, noor, ..] = game.round().turn_order[..] else {
            panic!()
        };
        let outbox = game.send(sam, ClientMessage::CastVote { suspect_id: noor });
        assert_eq!(rejected(&outbox), Some(RejectReason::WrongPhase));
    }

    #[test]
    fn a_vote_is_for_someone_else_and_stays_secret() {
        let mut game = Game::voting(4);
        let [sam, noor, ..] = game.round().turn_order[..] else {
            panic!()
        };

        let outbox = game.send(sam, ClientMessage::CastVote { suspect_id: noor });
        assert_eq!(
            outbox,
            vec![(Audience::Everyone, ServerMessage::VoteCast { voter_id: sam })]
        );
        assert_eq!(
            rejected(&game.send(noor, ClientMessage::CastVote { suspect_id: noor })),
            Some(RejectReason::InvalidVote)
        );
        assert_eq!(
            rejected(&game.send(noor, ClientMessage::CastVote { suspect_id: 99 })),
            Some(RejectReason::InvalidVote)
        );

        let view = game.room.snapshot(Viewer::Player(noor), game.now);
        let PhaseView::Voting {
            round,
            voting_remaining_ms,
        } = view.phase
        else {
            panic!()
        };
        assert_eq!(round.voted, vec![sam]);
        assert_eq!(round.your_vote, None);
        assert_eq!(round.active_player_id, None);
        assert_eq!(voting_remaining_ms, 30_000);
    }

    #[test]
    fn a_vote_can_change_until_the_vote_ends() {
        let mut game = Game::voting(3);
        let [sam, noor, jip] = game.round().turn_order[..] else {
            panic!()
        };
        game.send(sam, ClientMessage::CastVote { suspect_id: noor });
        let outbox = game.send(sam, ClientMessage::CastVote { suspect_id: jip });
        assert_eq!(
            outbox,
            vec![(Audience::Player(sam), ServerMessage::VoteCast { voter_id: sam })],
            "a change is confirmed to the voter only: the room already knows they voted"
        );

        let outbox = game.advance(limits::VOTE_TIME);
        let reveal = outbox
            .iter()
            .find_map(|(_, message)| match message {
                ServerMessage::Revealed { reveal } => Some(reveal),
                _ => None,
            })
            .unwrap();
        assert!(reveal.votes.contains(&Vote {
            voter_id: sam,
            suspect_id: jip
        }));
        assert_eq!(reveal.votes.iter().filter(|vote| vote.voter_id == sam).count(), 1);
    }

    #[test]
    fn the_vote_ends_once_everyone_has_voted() {
        let mut game = Game::voting(3);
        let order = game.round().turn_order.clone();
        let outbox = game.everyone_votes_for(|voter| other_than(&order, voter));
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::Revealed { .. }
        )));
        assert!(matches!(game.room.phase, Phase::Guessing { .. }));
    }

    #[test]
    fn when_time_is_up_your_last_suspicion_is_your_vote() {
        let mut game = Game::started(3);
        let [sam, noor, jip] = game.round().turn_order[..] else {
            panic!()
        };
        game.send(sam, ClientMessage::Suspect { suspect_id: Some(jip) });
        game.send(noor, ClientMessage::Suspect { suspect_id: Some(sam) });
        game.finish_drawing();
        game.send(noor, ClientMessage::CastVote { suspect_id: jip });

        let outbox = game.advance(limits::VOTE_TIME);
        let reveal = outbox
            .iter()
            .find_map(|(_, message)| match message {
                ServerMessage::Revealed { reveal } => Some(reveal),
                _ => None,
            })
            .unwrap();
        assert_eq!(
            reveal.votes,
            vec![
                Vote {
                    voter_id: noor,
                    suspect_id: jip
                },
                Vote {
                    voter_id: sam,
                    suspect_id: jip
                },
            ],
            "Noor's submitted vote stands, Sam's suspicion counts, Jip suspected nobody"
        );
    }

    #[test]
    fn players_who_are_gone_stop_holding_up_the_vote_after_a_grace() {
        let mut game = Game::voting(4);
        let order = game.round().turn_order.clone();
        game.room.disconnect(order[3], game.now);
        for voter in &order[..3] {
            game.send(
                *voter,
                ClientMessage::CastVote {
                    suspect_id: other_than(&order, *voter),
                },
            );
        }
        assert!(
            matches!(game.room.phase, Phase::Voting { .. }),
            "a dropped phone gets a moment to come back"
        );
        assert_eq!(game.room.next_deadline(game.now), Some(game.now + limits::VOTE_GRACE));

        let outbox = game.advance(limits::VOTE_GRACE);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::Revealed { .. }
        )));
    }

    #[test]
    fn a_player_who_comes_back_within_the_grace_still_votes() {
        let mut game = Game::voting(3);
        let order = game.round().turn_order.clone();
        let returning = order[2];
        let token = game
            .seats
            .iter()
            .find(|seat| seat.player_id == returning)
            .unwrap()
            .session_token
            .clone();
        game.room.disconnect(returning, game.now);
        game.send(order[0], ClientMessage::CastVote { suspect_id: order[1] });
        game.send(order[1], ClientMessage::CastVote { suspect_id: order[0] });
        game.advance(limits::VOTE_GRACE / 2);

        game.room.join("whoever", Some(&token), game.now).unwrap();
        game.advance(limits::VOTE_GRACE);
        assert!(matches!(game.room.phase, Phase::Voting { .. }));
        game.send(returning, ClientMessage::CastVote { suspect_id: order[0] });
        assert!(matches!(game.room.phase, Phase::Guessing { .. }));
    }

    #[test]
    fn a_player_who_joins_mid_round_watches_and_cannot_vote() {
        let mut game = Game::started(3);
        let (late, _) = game.room.join("Late", None, game.now).unwrap();
        let PhaseView::Drawing { round } = game.room.snapshot(Viewer::Player(late.player_id), game.now).phase else {
            panic!()
        };
        assert_eq!((round.role, round.word), (None, None));
        let suspect = game.round().turn_order[0];
        assert_eq!(
            rejected(&game.send(
                late.player_id,
                ClientMessage::Suspect {
                    suspect_id: Some(suspect)
                }
            )),
            Some(RejectReason::InvalidVote)
        );
        game.finish_drawing();
        assert_eq!(
            rejected(&game.send(late.player_id, ClientMessage::CastVote { suspect_id: suspect })),
            Some(RejectReason::InvalidVote)
        );
    }
}

mod reveal_and_points {
    use super::*;

    fn caught_game(players: usize) -> Game {
        let mut game = Game::voting(players);
        let bamboozler = game.bamboozler();
        let artists = game.artists();
        game.everyone_votes_for(|voter| if voter == bamboozler { artists[0] } else { bamboozler });
        game
    }

    fn result(game: &Game) -> &RoundResult {
        match &game.room.phase {
            Phase::Finished(result) => result,
            phase => panic!("not finished: {phase:?}"),
        }
    }

    fn points_of(game: &Game, player_id: PlayerId) -> u32 {
        game.room
            .players
            .iter()
            .find(|player| player.id == player_id)
            .unwrap()
            .score
    }

    #[test]
    fn only_the_bamboozler_guesses_and_only_after_the_reveal() {
        let mut game = Game::voting(3);
        let bamboozler = game.bamboozler();
        let guess = ClientMessage::GuessWord { guess: "x".into() };
        assert_eq!(
            rejected(&game.send(bamboozler, guess.clone())),
            Some(RejectReason::WrongPhase)
        );

        let mut game = caught_game(3);
        let artist = game.artists()[0];
        assert_eq!(rejected(&game.send(artist, guess)), Some(RejectReason::NotBamboozler));
    }

    #[test]
    fn a_finished_round_is_counted_without_the_word_or_anyone_in_it() {
        let mut game = caught_game(4);
        let bamboozler = game.bamboozler();
        let word = game.round().word.clone();
        let (guard, events) = crate::logging::capture::start();
        game.send(bamboozler, ClientMessage::GuessWord { guess: word.clone() });
        drop(guard);
        let rounds = crate::logging::capture::of(&events, crate::usage::TARGET, "round_finished");
        assert_eq!(rounds.len(), 1);
        let round = &rounds[0];
        assert_eq!(round["players"], "4");
        assert_eq!(round["caught"], "3");
        assert_eq!(round["caught_by_all"], "true");
        assert_eq!(round["guessed"], "true");
        assert_eq!(round["mode"], "one_stroke");
        let settings = &game.room.settings;
        assert_eq!(round["categories"], settings.categories.join(","));
        assert_eq!(round["category_count"], settings.categories.len().to_string());
        assert!(settings.categories.contains(&round["category"]));
        assert_eq!(
            round["adult"], "false",
            "a new room starts with everyday categories only"
        );
        let logged = format!("{round:?}");
        assert!(!logged.contains(&word), "the word stays out of the logs");
        for player in &game.room.players {
            assert!(!logged.contains(&player.name), "names stay out of the logs");
        }
    }

    #[test]
    fn caught_but_guessed_the_word() {
        let mut game = caught_game(4);
        let bamboozler = game.bamboozler();
        let word = game.round().word.to_uppercase();
        let outbox = game.send(bamboozler, ClientMessage::GuessWord { guess: word });
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::RoundFinished { .. }
        )));

        let result = result(&game);
        assert!(result.guess_correct);
        assert_eq!(points_of(&game, bamboozler), 1, "guessed the word, but not hidden");
        for artist in result.votes.iter().filter(|vote| vote.voter_id != bamboozler) {
            assert_eq!(points_of(&game, artist.voter_id), 1, "caught the bamboozler");
        }
    }

    #[test]
    fn a_longer_guess_counts_but_a_list_of_the_category_does_not() {
        let mut game = caught_game(3);
        let guess = format!("the tall {}", game.round().word);
        game.send(game.bamboozler(), ClientMessage::GuessWord { guess });
        assert!(result(&game).guess_correct);

        let mut game = caught_game(3);
        let guess = WORDS.join(" ");
        game.send(game.bamboozler(), ClientMessage::GuessWord { guess });
        assert!(!result(&game).guess_correct);
    }

    #[test]
    fn stayed_hidden_and_guessed_wrong() {
        let mut game = Game::voting(4);
        let bamboozler = game.bamboozler();
        let artists = game.artists();
        // One of three artists votes for the bamboozler: fewer than half.
        game.send(artists[0], ClientMessage::CastVote { suspect_id: bamboozler });
        game.send(artists[1], ClientMessage::CastVote { suspect_id: artists[2] });
        game.send(artists[2], ClientMessage::CastVote { suspect_id: artists[1] });
        game.send(bamboozler, ClientMessage::CastVote { suspect_id: artists[0] });
        game.send(
            bamboozler,
            ClientMessage::GuessWord {
                guess: "submarine".into(),
            },
        );

        assert!(!result(&game).guess_correct);
        assert_eq!(points_of(&game, bamboozler), 1, "stayed hidden");
        assert_eq!(points_of(&game, artists[0]), 1);
        assert_eq!(points_of(&game, artists[1]), 0);
    }

    #[test]
    fn exactly_half_is_not_hidden() {
        let mut game = Game::voting(3);
        let bamboozler = game.bamboozler();
        let artists = game.artists();
        game.send(artists[0], ClientMessage::CastVote { suspect_id: bamboozler });
        game.send(artists[1], ClientMessage::CastVote { suspect_id: artists[0] });
        game.send(bamboozler, ClientMessage::CastVote { suspect_id: artists[0] });
        game.advance(limits::GUESS_TIME);
        assert_eq!(points_of(&game, bamboozler), 0);
    }

    #[test]
    fn the_result_keeps_the_drawing_for_anyone_who_rejoins() {
        let mut game = Game::started(3);
        game.draw_a_stroke();
        game.draw_a_stroke();
        game.finish_round();
        let PhaseView::Finished { strokes, .. } = game.room.snapshot(Viewer::Screen, game.now).phase else {
            panic!()
        };
        assert_eq!(strokes.len(), 2);
        assert!(strokes.iter().all(|stroke| stroke.done && stroke.points.len() == 2));
    }

    #[test]
    fn no_guess_in_time_means_no_guess() {
        let mut game = caught_game(3);
        assert_eq!(game.room.next_deadline(game.now), Some(game.now + limits::GUESS_TIME));
        let outbox = game.advance(limits::GUESS_TIME);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::RoundFinished { .. }
        )));
        assert_eq!(result(&game).guess, None);
    }

    #[test]
    fn the_reveal_shows_the_bamboozler_and_every_vote() {
        let game = caught_game(3);
        let PhaseView::Guessing { reveal, .. } = game.room.snapshot(Viewer::Screen, game.now).phase else {
            panic!()
        };
        assert_eq!(reveal.bamboozler_id, game.bamboozler());
        assert_eq!(reveal.votes.len(), 3);
        assert_eq!(reveal.guess_remaining_ms, 20_000);
    }
}

mod edge_cases {
    use super::*;

    #[test]
    fn a_player_can_change_their_suspicion_at_most_once_a_second() {
        let mut game = Game::started(3);
        let [sam, noor, jip] = game.round().turn_order[..] else {
            panic!()
        };
        assert!(
            !game
                .send(sam, ClientMessage::Suspect { suspect_id: Some(noor) })
                .is_empty()
        );
        assert!(
            game.send(sam, ClientMessage::Suspect { suspect_id: Some(jip) })
                .is_empty(),
            "too soon: dropped"
        );
        assert!(
            !game
                .send(noor, ClientMessage::Suspect { suspect_id: Some(jip) })
                .is_empty(),
            "everyone has their own cooldown"
        );

        game.now += limits::SUSPICION_COOLDOWN;
        assert!(
            !game
                .send(sam, ClientMessage::Suspect { suspect_id: Some(jip) })
                .is_empty()
        );
        assert_eq!(
            game.round().suspicions,
            vec![
                Suspicion {
                    player_id: noor,
                    suspect_id: jip
                },
                Suspicion {
                    player_id: sam,
                    suspect_id: jip
                },
            ]
        );
    }

    #[test]
    fn lowering_the_rounds_below_what_was_played_ends_the_game() {
        let mut game = Game::started(3);
        game.finish_round();
        game.send(game.host(), ClientMessage::StartRound);
        game.finish_round();

        let settings = RoomSettings {
            rounds: 1,
            ..game.room.settings.clone()
        };
        game.send(game.host(), ClientMessage::UpdateSettings { settings });
        let outbox = game.send(game.host(), ClientMessage::StartRound);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::GameStarted { .. }
        )));
        assert_eq!(game.round().number, 1);
    }

    #[test]
    fn a_drawer_dropping_on_the_last_turn_starts_the_vote() {
        let mut game = Game::with_players(3);
        game.room.settings.turns_per_player = 1;
        game.send(game.host(), ClientMessage::StartRound);
        game.draw_a_stroke();
        game.draw_a_stroke();
        let last = game.active();

        let outbox = game.room.disconnect(last, game.now);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::VotingStarted { .. }
        )));
        assert!(matches!(game.room.phase, Phase::Voting { .. }));
    }
}

mod categories {
    use super::*;

    fn library_with_adults() -> Arc<WordLibrary> {
        Arc::new(WordLibrary::new(vec![
            WordPack {
                language: Language::En,
                adult: false,
                categories: BTreeMap::from([
                    ("Animals".into(), vec!["owl".into()]),
                    ("Food".into(), vec!["pizza".into()]),
                ]),
            },
            WordPack {
                language: Language::En,
                adult: true,
                categories: BTreeMap::from([("After dark".into(), vec!["hangover".into()])]),
            },
        ]))
    }

    fn room_with(categories: &[&str]) -> Game {
        let mut game = Game::with_library(3, library_with_adults());
        let settings = RoomSettings {
            categories: categories.iter().map(|name| name.to_string()).collect(),
            ..game.room.settings.clone()
        };
        let outbox = game.send(game.host(), ClientMessage::UpdateSettings { settings });
        assert!(rejected(&outbox).is_none());
        game
    }

    #[test]
    fn a_new_room_plays_its_languages_everyday_categories_and_lists_them_all() {
        let room = Room::new("BKTZ".into(), library_with_adults(), 3);
        assert_eq!(
            room.settings.categories,
            vec!["Animals".to_string(), "Food".to_string()]
        );

        let snapshot = room.snapshot(Viewer::Screen, Instant::now());
        let names: Vec<(&str, bool)> = snapshot
            .word_categories
            .iter()
            .map(|category| (category.name.as_str(), category.adult))
            .collect();
        assert_eq!(names, vec![("Animals", false), ("Food", false), ("After dark", true)]);
    }

    #[test]
    fn the_word_comes_from_the_picked_categories() {
        let mut game = room_with(&["Food"]);
        game.send(game.host(), ClientMessage::StartRound);
        assert_eq!(
            (game.round().category.as_str(), game.round().word.as_str()),
            ("Food", "pizza")
        );
    }

    #[test]
    fn adult_words_only_when_their_category_is_picked() {
        for _ in 0..5 {
            let mut game = room_with(&["Animals", "Food"]);
            game.send(game.host(), ClientMessage::StartRound);
            assert_ne!(game.round().category, "After dark");
        }
        let mut game = room_with(&["After dark"]);
        game.send(game.host(), ClientMessage::StartRound);
        assert_eq!(game.round().word, "hangover");
    }
}

mod avatars {
    use super::*;

    fn line(colour: &str, points: &[Point]) -> AvatarStroke {
        AvatarStroke {
            colour: colour.into(),
            pressure: false,
            points: points.to_vec(),
        }
    }

    fn face() -> Vec<AvatarStroke> {
        vec![line("#ffffff", &[Point(0.2, 0.2, 0.5), Point(0.8, 0.8, 0.5)])]
    }

    fn set(strokes: Vec<AvatarStroke>) -> ClientMessage {
        ClientMessage::SetAvatar { strokes }
    }

    fn changed(outbox: &Outbox) -> bool {
        has(outbox, |message| matches!(message, ServerMessage::AvatarChanged { .. }))
    }

    #[test]
    fn a_new_avatar_goes_to_everyone_and_into_the_snapshot() {
        let mut game = Game::with_players(3);
        let noor = game.seats[1].player_id;
        let outbox = game.send(noor, set(face()));
        assert_eq!(
            outbox,
            vec![(
                Audience::Everyone,
                ServerMessage::AvatarChanged {
                    player_id: noor,
                    strokes: face()
                }
            )]
        );

        let snapshot = game.room.snapshot(Viewer::Screen, game.now);
        assert_eq!(snapshot.players[1].avatar, face());
        assert!(snapshot.players[0].avatar.is_empty());
    }

    #[test]
    fn it_replaces_the_whole_avatar_and_may_be_empty() {
        let mut game = Game::with_players(3);
        let sam = game.host();
        game.send(sam, set(face()));
        game.now += limits::AVATAR_COOLDOWN;
        assert!(changed(&game.send(sam, set(Vec::new()))));
        assert!(game.room.players[0].avatar.is_empty());
    }

    #[test]
    fn only_between_rounds() {
        let mut game = Game::started(3);
        let sam = game.host();
        assert!(game.send(sam, set(face())).is_empty());
        assert!(game.room.players[0].avatar.is_empty());

        game.finish_round();
        assert!(changed(&game.send(sam, set(face()))));
    }

    #[test]
    fn at_most_once_a_second() {
        let mut game = Game::with_players(3);
        let sam = game.host();
        assert!(changed(&game.send(sam, set(face()))));
        game.now += limits::AVATAR_COOLDOWN - Duration::from_millis(1);
        assert!(game.send(sam, set(Vec::new())).is_empty());
        assert_eq!(game.room.players[0].avatar, face());
        game.now += Duration::from_millis(1);
        assert!(changed(&game.send(sam, set(Vec::new()))));
    }

    #[test]
    fn a_dropped_avatar_does_not_start_the_cooldown() {
        let mut game = Game::with_players(3);
        let sam = game.host();
        assert!(
            game.send(sam, set(vec![line("red", &[Point(0.5, 0.5, 0.5)])]))
                .is_empty()
        );
        assert!(changed(&game.send(sam, set(face()))));
    }

    #[test]
    fn at_most_the_stroke_limit() {
        let mut game = Game::with_players(3);
        let sam = game.host();
        let dot = line("#ffffff", &[Point(0.5, 0.5, 0.5)]);
        assert!(
            game.send(sam, set(vec![dot.clone(); limits::AVATAR_STROKES + 1]))
                .is_empty()
        );
        assert!(changed(&game.send(sam, set(vec![dot; limits::AVATAR_STROKES]))));
    }

    #[test]
    fn at_most_the_point_limit_in_total() {
        let mut game = Game::with_players(3);
        let sam = game.host();
        let half = vec![Point(0.5, 0.5, 0.5); limits::AVATAR_POINTS / 2];
        let mut too_many = vec![line("#ffffff", &half), line("#ffffff", &half)];
        too_many[1].points.push(Point(0.5, 0.5, 0.5));
        assert!(game.send(sam, set(too_many)).is_empty());
        assert!(changed(
            &game.send(sam, set(vec![line("#ffffff", &half), line("#ffffff", &half)]))
        ));
    }

    #[test]
    fn every_stroke_has_a_point() {
        let mut game = Game::with_players(3);
        let mut strokes = face();
        strokes.push(line("#ffffff", &[]));
        assert!(game.send(game.host(), set(strokes)).is_empty());
    }

    #[test]
    fn points_stay_on_the_square() {
        let mut game = Game::with_players(3);
        for point in [
            Point(1.01, 0.5, 0.5),
            Point(0.5, -0.01, 0.5),
            Point(0.5, 0.5, 1.5),
            Point(f32::NAN, 0.5, 0.5),
            Point(0.5, f32::INFINITY, 0.5),
        ] {
            assert!(game.send(game.host(), set(vec![line("#ffffff", &[point])])).is_empty());
        }
        assert!(game.room.players[0].avatar.is_empty());
    }

    #[test]
    fn colours_come_from_the_avatar_palette() {
        let mut game = Game::with_players(3);
        let sam = game.host();
        for colour in ["#000000", "#080357", "#FFFFFF", "red", "url(#x)"] {
            assert!(
                game.send(sam, set(vec![line(colour, &[Point(0.5, 0.5, 0.5)])]))
                    .is_empty()
            );
        }
        let palette: Vec<AvatarStroke> = limits::AVATAR_COLOURS
            .iter()
            .map(|colour| line(colour, &[Point(0.5, 0.5, 0.5)]))
            .collect();
        assert!(changed(&game.send(sam, set(palette))));
    }

    #[test]
    fn points_are_rounded_to_three_decimals() {
        let mut game = Game::with_players(3);
        game.send(
            game.host(),
            set(vec![line("#ffffff", &[Point(0.123_456, 0.5, 0.987_6)])]),
        );
        assert_eq!(game.room.players[0].avatar[0].points[0], Point(0.123, 0.5, 0.988));
    }

    #[test]
    fn the_face_stays_with_the_seat_after_a_reconnect() {
        let mut game = Game::with_players(3);
        let noor = game.seats[1].clone();
        game.send(noor.player_id, set(face()));
        game.room.disconnect(noor.player_id, game.now);
        game.room.join("Noor", Some(&noor.session_token), game.now).unwrap();
        let snapshot = game.room.snapshot(Viewer::Player(noor.player_id), game.now);
        assert_eq!(snapshot.players[1].avatar, face());
    }
}
