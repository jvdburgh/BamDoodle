import { describe, expect, it } from "vitest";
import { SoundCuesUtils, type SoundMoment } from "@/components/sound/_utils/soundCues.utils";

const moment = (patch: Partial<SoundMoment> = {}): SoundMoment => ({
  phase: "drawing",
  turnCount: 0,
  yourTurn: false,
  turnSeconds: 10,
  voteSeconds: 0,
  you: null,
  role: null,
  reveal: null,
  result: null,
  ...patch,
});

const { between } = SoundCuesUtils;

describe("SoundCuesUtils.between", () => {
  it("plays a jingle when drawing starts, also in later rounds", () => {
    expect(between(moment({ phase: "lobby" }), moment())).toEqual(["start"]);
    expect(between(moment({ phase: "finished" }), moment())).toEqual(["start"]);
  });

  it("sounds time's up when the final vote opens, and a reveal after it", () => {
    expect(between(moment(), moment({ phase: "voting", voteSeconds: 30 }))).toEqual(["timeUp"]);
    expect(between(moment({ phase: "voting" }), moment({ phase: "guessing" }))).toEqual(["reveal"]);
  });

  it("stays quiet when nothing changed", () => {
    expect(between(moment(), moment())).toEqual([]);
    expect(between(moment({ phase: "finished" }), moment({ phase: "finished" }))).toEqual([]);
  });

  it("blips on a new turn, brighter when it's yours", () => {
    expect(between(moment(), moment({ turnCount: 1 }))).toEqual(["turn"]);
    expect(between(moment(), moment({ turnCount: 1, yourTurn: true }))).toEqual(["yourTurn"]);
  });

  it("ticks every second in the last three seconds of a turn", () => {
    expect(between(moment({ turnSeconds: 5 }), moment({ turnSeconds: 4 }))).toEqual([]);
    expect(between(moment({ turnSeconds: 4 }), moment({ turnSeconds: 3 }))).toEqual(["tick"]);
    expect(between(moment({ turnSeconds: 1 }), moment({ turnSeconds: 0 }))).toEqual(["tick"]);
  });

  it("doesn't tick when a new turn resets the clock", () => {
    expect(between(moment({ turnSeconds: 1 }), moment({ turnCount: 1, turnSeconds: 10 }))).toEqual(["turn"]);
  });

  it("ticks the vote's last five seconds", () => {
    const voting = (voteSeconds: number) => moment({ phase: "voting", voteSeconds });
    expect(between(voting(7), voting(6))).toEqual([]);
    expect(between(voting(6), voting(5))).toEqual(["voteTick"]);
  });
});

describe("SoundCuesUtils.between: how the round went for you", () => {
  const ME = 1;
  const BAMBOOZLER = 2;
  /** Four players: me, the bamboozler and two more artists. */
  const voting = (patch: Partial<SoundMoment> = {}) => moment({ phase: "voting", you: ME, role: "artist", ...patch });
  const revealed = (votes: [number, number][], patch: Partial<SoundMoment> = {}) =>
    moment({
      phase: "guessing",
      you: ME,
      role: "artist",
      reveal: {
        bamboozlerId: BAMBOOZLER,
        votes: votes.map(([voterId, suspectId]) => ({ voterId, suspectId })),
        artists: 3,
      },
      ...patch,
    });

  it("cheers when you caught the bamboozler, after the reveal", () => {
    expect(between(voting(), revealed([[ME, BAMBOOZLER]]))).toEqual(["reveal", "caughtThem"]);
  });

  it("sighs when you were fooled, or didn't vote", () => {
    expect(between(voting(), revealed([[ME, 3]]))).toEqual(["reveal", "fooled"]);
    expect(between(voting(), revealed([[3, BAMBOOZLER]]))).toEqual(["reveal", "fooled"]);
  });

  it("winks when you're the bamboozler and fewer than half the artists caught you", () => {
    const you = { you: BAMBOOZLER, role: "bamboozler" } as const;
    const votes: [number, number][] = [
      [ME, BAMBOOZLER],
      [BAMBOOZLER, 3],
      [3, ME],
    ];
    expect(between(voting(you), revealed(votes, you))).toEqual(["reveal", "slippedThrough"]);
  });

  it("buzzes when you're the bamboozler and half the artists or more caught you", () => {
    const you = { you: BAMBOOZLER, role: "bamboozler" } as const;
    const caught = revealed(
      [
        [ME, BAMBOOZLER],
        [3, BAMBOOZLER],
      ],
      you,
    );
    expect(between(voting(you), caught)).toEqual(["reveal", "busted"]);
    const twoOfFour = { ...caught, reveal: { ...caught.reveal!, artists: 4 } };
    expect(between(voting(you), twoOfFour)).toEqual(["reveal", "busted"]);
  });

  it("only plays the reveal on a host screen and for someone who wasn't in the round", () => {
    const votes: [number, number][] = [[ME, BAMBOOZLER]];
    const screen = { you: null, role: null };
    expect(between(voting(screen), revealed(votes, screen))).toEqual(["reveal"]);
    const watching = { you: 9, role: null };
    expect(between(voting(watching), revealed(votes, watching))).toEqual(["reveal"]);
  });

  const guessing = (patch: Partial<SoundMoment> = {}) => revealed([[ME, BAMBOOZLER]], patch);
  const finished = (result: Partial<NonNullable<SoundMoment["result"]>> = {}, patch: Partial<SoundMoment> = {}) =>
    moment({
      phase: "finished",
      you: ME,
      result: { guessCorrect: false, gameOver: false, awards: [], scores: [], ...result },
      ...patch,
    });

  it("tells everyone whether the bamboozler guessed the word, the bamboozler their own way", () => {
    expect(between(guessing(), finished({ guessCorrect: true }))).toEqual(["guessedIt"]);
    expect(between(guessing(), finished({ guessCorrect: false }))).toEqual(["nope"]);
    const bamboozler = { you: BAMBOOZLER, role: "bamboozler" } as const;
    expect(between(guessing(bamboozler), finished({ guessCorrect: true }, { you: BAMBOOZLER }))).toEqual(["nailedIt"]);
    expect(between(guessing(bamboozler), finished({ guessCorrect: false }, { you: BAMBOOZLER }))).toEqual(["nope"]);
    const screen = { you: null, role: null };
    expect(between(guessing(screen), finished({ guessCorrect: true }, screen))).toEqual(["guessedIt"]);
  });

  it("drops a coin once when you scored this round, after the guess", () => {
    const caught = { playerId: ME, reason: "caughtTheBamboozler", points: 1 } as const;
    expect(between(guessing(), finished({ awards: [caught] }))).toEqual(["nope", "coin"]);
    const bamboozler = { you: BAMBOOZLER, role: "bamboozler" } as const;
    const twice = [
      { playerId: BAMBOOZLER, reason: "guessedTheWord", points: 1 },
      { playerId: BAMBOOZLER, reason: "stayedHidden", points: 1 },
    ] as const;
    expect(
      between(guessing(bamboozler), finished({ guessCorrect: true, awards: [...twice] }, { you: BAMBOOZLER })),
    ).toEqual(["nailedIt", "coin"]);
    expect(between(guessing(), finished({ awards: [{ ...caught, playerId: 3 }] }))).toEqual(["nope"]);
  });

  it("ends the game with a win for whoever is on top, ties too, and a good game for the rest", () => {
    const scores = [
      { id: ME, score: 4 },
      { id: BAMBOOZLER, score: 4 },
      { id: 3, score: 2 },
    ];
    expect(between(guessing(), finished({ gameOver: true, scores }))).toEqual(["nope", "win"]);
    const third = { you: 3 };
    expect(between(guessing(third), finished({ gameOver: true, scores }, third))).toEqual(["nope", "goodGame"]);
  });

  it("keeps the fanfare for a host screen and for someone who joined during the last round", () => {
    const scores = [
      { id: ME, score: 4 },
      { id: 9, score: 0 },
    ];
    const screen = { you: null, role: null };
    expect(between(guessing(screen), finished({ gameOver: true, scores }, screen))).toEqual(["nope", "fanfare"]);
    const watching = { you: 9, role: null };
    expect(between(guessing(watching), finished({ gameOver: true, scores }, watching))).toEqual(["nope", "fanfare"]);
  });

  it("plays the guess, the coin and the ending one after the other, in that order", () => {
    const scores = [{ id: ME, score: 1 }];
    const caught = { playerId: ME, reason: "caughtTheBamboozler", points: 1 } as const;
    expect(between(guessing(), finished({ gameOver: true, scores, awards: [caught] }))).toEqual([
      "nope",
      "coin",
      "win",
    ]);
  });
});

describe("SoundCuesUtils.forPress", () => {
  /** A stand-in for the element clicked: which of the selectors `forPress` asks about it matches. */
  const pressed = (matches: { own?: boolean; choice?: boolean; button?: boolean }) => ({
    closest: (selector: string) =>
      (selector === SoundCuesUtils.pressSelectors.own && matches.own) ||
      (selector === SoundCuesUtils.pressSelectors.choice && matches.choice) ||
      (selector === SoundCuesUtils.pressSelectors.button && matches.button)
        ? {}
        : null,
  });

  it("taps for a button and picks for a choice", () => {
    expect(SoundCuesUtils.forPress(pressed({ button: true }))).toBe("tap");
    expect(SoundCuesUtils.forPress(pressed({ choice: true }))).toBe("pick");
  });

  it("stays quiet for anything else, and for controls that make their own sound", () => {
    expect(SoundCuesUtils.forPress(pressed({}))).toBeNull();
    expect(SoundCuesUtils.forPress(pressed({ own: true, button: true }))).toBeNull();
    expect(SoundCuesUtils.forPress(null)).toBeNull();
  });
});
