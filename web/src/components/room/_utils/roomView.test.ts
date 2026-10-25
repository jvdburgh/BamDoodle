import { describe, expect, it } from "vitest";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import type { RoundResult } from "@/protocol/generated/RoundResult";
import type { RoundView } from "@/protocol/generated/RoundView";

const room = {
  code: "BKZW",
  players: [
    { id: 1, name: "Pip", score: 0, connected: true, avatar: [], ready: true },
    { id: 2, name: "Juno", score: 3, connected: true, avatar: [], ready: true },
    { id: 3, name: "Mo", score: 1, connected: false, avatar: [], ready: true },
  ],
};
const players = RoomViewUtils.players(room);

const round = (patch: Partial<RoundView> = {}): RoundView => ({
  number: 1,
  rounds: 5,
  category: "Animals",
  word: "giraffe",
  role: "artist",
  turnOrder: [3, 1, 2],
  activePlayerId: 3,
  turnRemainingMs: 15_000,
  turn: 1,
  turnsPerPlayer: 2,
  strokes: [],
  suspicions: [],
  voted: [],
  yourVote: null,
  ...patch,
});

describe("RoomViewUtils.players", () => {
  it("gives every player the same face on every device", () => {
    expect(players.map((player) => player.name)).toEqual(["Pip", "Juno", "Mo"]);
    expect(RoomViewUtils.players(room)).toEqual(players);
    expect(players[0]?.avatarSeed).not.toBe(players[1]?.avatarSeed);
    expect(players[0]?.avatar.length).toBeGreaterThan(0);
  });
});

describe("RoomViewUtils faces", () => {
  it("shows the face a player sent instead of the seeded one", () => {
    const face = [{ colour: "#fbb03b", pressure: false, points: [[0.5, 0.5, 0.5]] as [number, number, number][] }];
    const [pip] = RoomViewUtils.players({ code: "BKZW", players: [{ ...room.players[0]!, avatar: face }] });
    expect(pip?.avatar).toEqual(AvatarUtils.fromWire(face));
  });
});

describe("RoomViewUtils turns", () => {
  it("finds who draws now and who is next in the turn order", () => {
    expect(RoomViewUtils.active(round(), players)?.name).toBe("Mo");
    expect(RoomViewUtils.next(round(), players)?.name).toBe("Pip");
    // Mo's phone is away, so after Juno the next turn is Pip's.
    expect(RoomViewUtils.next(round({ activePlayerId: 2 }), players)?.name).toBe("Pip");
  });

  it("skips players who are away, as the server does", () => {
    const away = players.map((player) => (player.id === 1 ? { ...player, connected: false } : player));
    expect(RoomViewUtils.next(round(), away)?.name).toBe("Juno");
    expect(RoomViewUtils.next(round({ activePlayerId: 2, turn: 2 }), away)).toBeUndefined();
  });

  it("has nobody next on the very last turn", () => {
    expect(RoomViewUtils.next(round({ activePlayerId: 2, turn: 2 }), players)).toBeUndefined();
    expect(RoomViewUtils.next(round({ activePlayerId: null }), players)).toBeUndefined();
  });

  it("counts turns so every turn has its own number", () => {
    const counts = [
      round(),
      round({ activePlayerId: 1 }),
      round({ activePlayerId: 2 }),
      round({ activePlayerId: 3, turn: 2 }),
    ].map(RoomViewUtils.turnCount);
    expect(counts).toEqual([1, 2, 3, 4]);
    expect(RoomViewUtils.turnCount(null)).toBe(0);
  });
});

describe("RoomViewUtils.suspectedBy and votes", () => {
  it("says who suspects each player", () => {
    const suspicions = [
      { playerId: 1, suspectId: 3 },
      { playerId: 2, suspectId: 3 },
      { playerId: 3, suspectId: 1 },
    ];
    expect(RoomViewUtils.suspectedBy(round({ suspicions }))).toEqual({ 3: [1, 2], 1: [3] });
  });

  it("maps votes by voter", () => {
    expect(RoomViewUtils.votes([{ voterId: 1, suspectId: 3 }])).toEqual({ 1: 3 });
  });
});

describe("RoomViewUtils results", () => {
  const result: RoundResult = {
    number: 1,
    rounds: 5,
    gameOver: false,
    category: "Animals",
    word: "giraffe",
    bamboozlerId: 3,
    guess: "giraffe",
    guessCorrect: true,
    votes: [],
    awards: [
      { playerId: 1, reason: "caughtTheBamboozler", points: 1 },
      { playerId: 3, reason: "guessedTheWord", points: 1 },
      { playerId: 3, reason: "stayedHidden", points: 1 },
    ],
    scores: room.players,
  };

  it("adds up each player's awards; an award means they got it right", () => {
    expect(RoomViewUtils.roundScores(result)).toEqual({
      1: { points: 1, right: true },
      2: { points: 0, right: false },
      3: { points: 2, right: true },
    });
  });

  it("tells the cards the bamboozler and the votes, and the points once the round is scored", () => {
    const reveal = { bamboozlerId: 3, votes: [{ voterId: 1, suspectId: 3 }], guessRemainingMs: 20_000 };
    expect(RoomViewUtils.outcome(reveal, null, room.players)).toEqual({ bamboozlerId: 3, votes: { 1: 3 } });
    expect(RoomViewUtils.outcome(null, { ...result, votes: reveal.votes }, room.players)).toEqual({
      bamboozlerId: 3,
      votes: { 1: 3 },
      scores: RoomViewUtils.roundScores(result),
      totals: { 1: 0, 2: 3, 3: 1 },
    });
    expect(RoomViewUtils.outcome(null, null, room.players)).toBeUndefined();
  });

  it("ranks highest first and lets ties share a place", () => {
    expect(RoomViewUtils.standings({ 1: 2, 2: 5, 3: 2, 4: 1 }, [1, 2, 3, 4])).toEqual([
      { playerId: 2, total: 5, place: 1 },
      { playerId: 1, total: 2, place: 2 },
      { playerId: 3, total: 2, place: 2 },
      { playerId: 4, total: 1, place: 4 },
    ]);
    expect(RoomViewUtils.totals(room.players)).toEqual({ 1: 0, 2: 3, 3: 1 });
  });
});

describe("RoomViewUtils.stillOnTheirFace", () => {
  const seat = (id: number, name: string, ready: boolean) => ({
    ...RoomViewUtils.players({
      code: "BKZW",
      players: [{ id, name, score: 0, connected: true, avatar: [], ready }],
    })[0]!,
  });

  it("names who the host is waiting for", () => {
    expect(RoomViewUtils.stillOnTheirFace([seat(1, "Pip", true)])).toBeNull();
    expect(RoomViewUtils.stillOnTheirFace([seat(1, "Pip", true), seat(2, "Mo", false)])).toBe(
      "Mo is still drawing their face",
    );
    expect(RoomViewUtils.stillOnTheirFace([seat(2, "Mo", false), seat(3, "Kiki", false)])).toBe(
      "Mo and Kiki are still drawing their faces",
    );
    expect(RoomViewUtils.stillOnTheirFace([seat(1, "A", false), seat(2, "B", false), seat(3, "C", false)])).toBe(
      "3 players are still drawing their faces",
    );
  });
});

describe("RoomViewUtils.waitingForPlayers", () => {
  const seats = (connected: boolean[]) =>
    RoomViewUtils.players({
      code: "BKZW",
      players: connected.map((online, index) => ({
        id: index + 1,
        name: `P${index}`,
        score: 0,
        connected: online,
        avatar: [],
        ready: true,
      })),
    });

  it("says how many more players a round needs, counting only those here", () => {
    expect(RoomViewUtils.waitingForPlayers(seats([]))).toBe("Waiting for 3 players to join");
    expect(RoomViewUtils.waitingForPlayers(seats([true, true, false]))).toBe("Waiting for 1 more player");
    expect(RoomViewUtils.waitingForPlayers(seats([true, true, true]))).toBeNull();
  });
});

describe("RoomViewUtils.names", () => {
  const seats = RoomViewUtils.players({
    code: "BKZW",
    players: ["Pip", "Juno", "Mo", "Kiki"].map((name, index) => ({
      id: index + 1,
      name,
      score: 0,
      connected: true,
      avatar: [],
      ready: true,
    })),
  });

  it("names you first, then two, then how many more", () => {
    expect(RoomViewUtils.names([4, 2], seats, 2)).toBe("you and Kiki");
    expect(RoomViewUtils.names([1, 3, 4, 2], seats, 2)).toBe("you, Pip and 2 more");
    expect(RoomViewUtils.names([3], seats, null)).toBe("Mo");
  });
});
