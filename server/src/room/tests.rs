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
        let mut room = Room::new("BKTZ".into(), library(), 7);
        let names = ["Sam", "Noor", "Jip", "Max", "Ada", "Bo", "Cas", "Dex"];
        let seats = names[..count]
            .iter()
            .map(|name| room.join(name, None).unwrap().0)
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
        assert!(
            outbox
                .iter()
                .any(|(_, message)| matches!(message, ServerMessage::RoundStarted { .. }))
        );
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

    fn round(&self) -> &Round {
        match &self.room.phase {
            Phase::Drawing(round) | Phase::Guessing { round, .. } => round,
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

mod seats {
    use super::*;

    #[test]
    fn first_player_hosts_and_everyone_hears_about_joins() {
        let mut room = Room::new("BKTZ".into(), library(), 1);
        let (sam, outbox) = room.join("Sam", None).unwrap();
        assert!(has(
            &outbox,
            |message| matches!(message, ServerMessage::HostChanged { host_id } if *host_id == sam.player_id)
        ));

        let (_, outbox) = room.join("Noor", None).unwrap();
        assert!(has(
            &outbox,
            |message| matches!(message, ServerMessage::PlayerJoined { player } if player.name == "Noor")
        ));
        assert_eq!(room.host_id, Some(sam.player_id));
    }

    #[test]
    fn names_are_tidied_unique_and_short() {
        let mut room = Room::new("BKTZ".into(), library(), 1);
        let (seat, _) = room.join("  Sam \n  van   Dam ", None).unwrap();
        assert_eq!(room.players[0].name, "Sam van Dam");
        assert_eq!(seat.session_token.len(), 32);

        assert_eq!(room.join("sam VAN dam", None).unwrap_err(), RejectReason::NameTaken);
        assert_eq!(room.join("   ", None).unwrap_err(), RejectReason::InvalidName);
        assert_eq!(room.join(&"x".repeat(21), None).unwrap_err(), RejectReason::InvalidName);
        assert!(room.join(&"x".repeat(20), None).is_ok());
    }

    #[test]
    fn the_room_is_full_at_eight() {
        let mut game = Game::with_players(8);
        assert_eq!(game.room.join("Eve", None).unwrap_err(), RejectReason::RoomFull);
    }

    #[test]
    fn a_session_token_takes_back_the_seat_and_score() {
        let mut game = Game::with_players(3);
        let noor = game.seats[1].clone();
        game.room.players[1].score = 4;
        game.room.disconnect(noor.player_id, game.now);

        let (seat, outbox) = game.room.join("someone else", Some(&noor.session_token)).unwrap();
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
        let (seat, _) = room.join("Sam", Some("not-a-token")).unwrap();
        assert_ne!(seat.session_token, "not-a-token");
    }

    #[test]
    fn the_host_role_moves_on_when_the_host_leaves() {
        let mut game = Game::with_players(3);
        let outbox = game.room.disconnect(game.host(), game.now);
        let noor = game.seats[1].player_id;
        assert!(has(
            &outbox,
            |message| matches!(message, ServerMessage::HostChanged { host_id } if *host_id == noor)
        ));
    }

    #[test]
    fn the_seat_grace_starts_when_the_round_ends() {
        let mut game = Game::started(4);
        let gone = game.round().turn_order[3];
        game.room.disconnect(gone, game.now);
        game.advance(Duration::from_secs(60));
        game.advance(limits::GUESS_TIME);
        assert!(matches!(game.room.phase, Phase::Finished(_)));
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
            language: Language::Nl,
            adults: false,
            round_seconds: 90,
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
        let too_short = RoomSettings {
            round_seconds: 5,
            ..RoomSettings::default()
        };
        let outbox = game.send(game.host(), ClientMessage::UpdateSettings { settings: too_short });
        assert_eq!(rejected(&outbox), Some(RejectReason::InvalidSettings));
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
        }
    }

    #[test]
    fn the_bamboozler_never_receives_the_word_until_the_round_is_over() {
        let mut game = Game::with_players(4);
        let mut outbox = game.send(game.host(), ClientMessage::StartRound);
        let bamboozler = game.bamboozler();
        let word = game.round().word.clone();
        outbox.extend(game.draw_a_stroke());
        outbox.extend(game.everyone_votes_for(|voter| {
            if voter == bamboozler {
                game_first_other(voter)
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

    fn game_first_other(voter: PlayerId) -> PlayerId {
        if voter == 1 { 2 } else { 1 }
    }

    #[test]
    fn the_next_round_picks_a_new_word() {
        let mut game = Game::started(3);
        let first = game.round().word.clone();
        game.advance(Duration::from_secs(60));
        game.advance(limits::GUESS_TIME);
        assert!(matches!(game.room.phase, Phase::Finished(_)));

        game.send(game.host(), ClientMessage::StartRound);
        assert_ne!(game.round().word, first);
        assert_eq!(game.round().number, 2);
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
    fn classic_turns_end_after_one_stroke() {
        let mut game = Game::started(3);
        let first = game.active();
        let outbox = game.draw_a_stroke();
        assert_ne!(game.active(), first);
        assert!(has(
            &outbox,
            |message| matches!(message, ServerMessage::TurnStarted { player_id, .. } if *player_id == game.active())
        ));
    }

    #[test]
    fn timed_turns_allow_several_strokes_until_the_time_is_up() {
        let mut game = Game::with_players(3);
        game.room.settings.mode = TurnMode::Timed;
        game.send(game.host(), ClientMessage::StartRound);
        let first = game.active();
        game.draw_a_stroke();
        game.draw_a_stroke();
        assert_eq!(game.active(), first);
        assert_eq!(game.round().strokes.len(), 2);

        let outbox = game.advance(limits::TIMED_TURN);
        assert_ne!(game.active(), first);
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::TurnStarted {
                duration_ms: 10_000,
                ..
            }
        )));
    }

    #[test]
    fn a_turn_passes_when_its_time_runs_out_and_ends_the_stroke() {
        let mut game = Game::started(3);
        let first = game.active();
        game.send(first, begin(&[Point(0.5, 0.5, 0.5)]));
        assert_eq!(game.room.next_deadline(game.now), Some(game.now + limits::CLASSIC_TURN));

        let outbox = game.advance(limits::CLASSIC_TURN);
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
    fn a_disconnected_drawer_loses_their_turn_and_is_skipped() {
        let mut game = Game::started(4);
        let first = game.active();
        let second = game.round().turn_order[1];
        game.room.disconnect(second, game.now);
        game.draw_a_stroke();
        assert_ne!(game.active(), second);
        assert_ne!(game.active(), first);

        let third = game.active();
        game.room.disconnect(third, game.now);
        assert_ne!(game.active(), third);
    }
}

mod voting {
    use super::*;

    #[test]
    fn a_vote_is_once_for_someone_else_and_stays_secret() {
        let mut game = Game::started(4);
        let [sam, noor, ..] = game.round().turn_order[..] else {
            panic!()
        };

        let outbox = game.send(sam, ClientMessage::CastVote { suspect_id: noor });
        assert_eq!(
            outbox,
            vec![(Audience::Everyone, ServerMessage::VoteCast { voter_id: sam })]
        );
        assert_eq!(
            rejected(&game.send(sam, ClientMessage::CastVote { suspect_id: noor })),
            Some(RejectReason::AlreadyVoted)
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
        let PhaseView::Drawing { round } = view.phase else {
            panic!()
        };
        assert_eq!(round.voted, vec![sam]);
        assert_eq!(round.your_vote, None);
    }

    #[test]
    fn the_round_ends_once_everyone_has_voted() {
        let mut game = Game::started(3);
        let order = game.round().turn_order.clone();
        let outbox = game.everyone_votes_for(|voter| *order.iter().find(|id| **id != voter).unwrap());
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::Revealed { .. }
        )));
        assert!(matches!(game.room.phase, Phase::Guessing { .. }));
    }

    #[test]
    fn players_who_are_gone_stop_holding_up_the_vote_after_a_grace() {
        let mut game = Game::started(4);
        let order = game.round().turn_order.clone();
        game.room.disconnect(order[3], game.now);
        for voter in &order[..3] {
            let suspect = *order.iter().find(|id| *id != voter).unwrap();
            game.send(*voter, ClientMessage::CastVote { suspect_id: suspect });
        }
        assert!(
            matches!(game.room.phase, Phase::Drawing(_)),
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
        let mut game = Game::started(3);
        let order = game.round().turn_order.clone();
        let sessions: Vec<String> = game.seats.iter().map(|seat| seat.session_token.clone()).collect();
        let returning = order[2];
        game.room.disconnect(returning, game.now);
        game.send(order[0], ClientMessage::CastVote { suspect_id: order[1] });
        game.send(order[1], ClientMessage::CastVote { suspect_id: order[0] });
        game.advance(limits::VOTE_GRACE / 2);

        let token = &sessions[game.seats.iter().position(|seat| seat.player_id == returning).unwrap()];
        game.room.join("whoever", Some(token)).unwrap();
        game.advance(limits::VOTE_GRACE);
        assert!(matches!(game.room.phase, Phase::Drawing(_)));
        game.send(returning, ClientMessage::CastVote { suspect_id: order[0] });
        assert!(matches!(game.room.phase, Phase::Guessing { .. }));
    }

    #[test]
    fn the_round_ends_when_the_timer_runs_out() {
        let mut game = Game::started(3);
        let outbox = game.advance(Duration::from_secs(60));
        assert!(has(&outbox, |message| matches!(
            message,
            ServerMessage::Revealed { .. }
        )));
        assert_eq!(
            rejected(&game.send(game.host(), ClientMessage::CastVote { suspect_id: 2 })),
            Some(RejectReason::WrongPhase)
        );
    }

    #[test]
    fn a_player_who_joins_mid_round_watches_and_cannot_vote() {
        let mut game = Game::started(3);
        let (late, _) = game.room.join("Late", None).unwrap();
        let PhaseView::Drawing { round } = game.room.snapshot(Viewer::Player(late.player_id), game.now).phase else {
            panic!()
        };
        assert_eq!((round.role, round.word), (None, None));
        let suspect = game.round().turn_order[0];
        assert_eq!(
            rejected(&game.send(late.player_id, ClientMessage::CastVote { suspect_id: suspect })),
            Some(RejectReason::InvalidVote)
        );
    }
}

mod reveal_and_points {
    use super::*;

    fn caught_game(players: usize) -> Game {
        let mut game = Game::started(players);
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
        let mut game = Game::started(3);
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
    fn stayed_hidden_and_guessed_wrong() {
        let mut game = Game::started(4);
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
        let mut game = Game::started(3);
        let bamboozler = game.bamboozler();
        let artists = game.artists();
        game.send(artists[0], ClientMessage::CastVote { suspect_id: bamboozler });
        game.send(artists[1], ClientMessage::CastVote { suspect_id: artists[0] });
        game.send(bamboozler, ClientMessage::CastVote { suspect_id: artists[0] });
        game.advance(limits::GUESS_TIME);
        assert_eq!(points_of(&game, bamboozler), 0);
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
