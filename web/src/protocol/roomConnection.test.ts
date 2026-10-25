import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarStroke } from "@/protocol/generated/AvatarStroke";
import type { ClientMessage } from "@/protocol/generated/ClientMessage";
import type { RoomSnapshot } from "@/protocol/generated/RoomSnapshot";
import type { RoundView } from "@/protocol/generated/RoundView";
import type { ServerMessage } from "@/protocol/generated/ServerMessage";
import {
  RoomConnection,
  type RoomConnectionOptions,
  RoomConnectionTiming,
  type RoomIntent,
  type SocketLike,
} from "@/protocol/roomConnection";
import { RoomStateUtils } from "@/protocol/roomState.utils";
import { SessionTokenUtils } from "@/protocol/sessionTokens.utils";

class FakeSocket implements SocketLike {
  readyState: SocketLike["readyState"] = 0;
  sent: ClientMessage[] = [];
  closed = false;
  onopen: SocketLike["onopen"] = null;
  onmessage: SocketLike["onmessage"] = null;
  onclose: SocketLike["onclose"] = null;

  send(data: string) {
    this.sent.push(JSON.parse(data) as ClientMessage);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }

  open() {
    this.readyState = 1;
    this.onopen?.call(this as unknown as WebSocket, new Event("open"));
  }

  receive(message: ServerMessage) {
    this.onmessage?.call(this as unknown as WebSocket, new MessageEvent("message", { data: JSON.stringify(message) }));
  }

  /** The network went away: the browser fires close without us asking. */
  drop() {
    this.readyState = 3;
    this.onclose?.call(this as unknown as WebSocket, new CloseEvent("close"));
  }
}

const room: RoomSnapshot = {
  code: "BKTZ",
  hostId: 1,
  hostScreen: null,
  players: [{ id: 1, name: "Sam", score: 0, connected: true, avatar: [], ready: true }],
  settings: {
    mode: "oneStroke",
    turnsPerPlayer: 3,
    turnSeconds: 20,
    rounds: 5,
    language: "en",
    categories: ["Animals"],
  },
  wordCategories: [{ language: "en", name: "Animals", adult: false, words: 12 }],
  phase: { phase: "lobby" },
};

const round: RoundView = {
  number: 1,
  rounds: 5,
  category: "Animals",
  word: "giraffe",
  role: "artist",
  turnOrder: [1, 2, 3],
  activePlayerId: 1,
  turnRemainingMs: 15_000,
  turn: 1,
  turnsPerPlayer: 3,
  strokes: [],
  suspicions: [],
  voted: [],
  yourVote: null,
};

const joined = (token = "token-1"): ServerMessage => ({
  type: "joined",
  serverVersion: "dev",
  you: 1,
  sessionToken: token,
  room,
});

let sockets: FakeSocket[];
let now: number;

function connect(
  intent: RoomIntent,
  tokens = SessionTokenUtils.memory(),
  extra: Pick<RoomConnectionOptions, "appVersion" | "fetchVersion" | "onNewVersion"> = {},
) {
  const connection = new RoomConnection(intent, {
    ...extra,
    url: "ws://test/ws",
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    tokens,
    random: () => 1,
    now: () => now,
  });
  connection.start();
  return { connection, tokens, socket: () => sockets.at(-1)! };
}

function joinedConnection() {
  const opened = connect({ kind: "join", code: "BKTZ", name: "Sam" });
  opened.socket().open();
  opened.socket().receive(joined());
  return opened;
}

function advance(ms: number) {
  now += ms;
  vi.advanceTimersByTime(ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  sockets = [];
  now = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("RoomConnection: joining", () => {
  it("says hello with the right first message", () => {
    const tokens = SessionTokenUtils.memory();
    tokens.set("bktz", "Sam", "saved");
    for (const [intent, hello] of [
      [
        { kind: "create", name: "Sam" },
        { type: "createRoom", name: "Sam", settings: null },
      ],
      [
        { kind: "create", name: "Sam", settings: room.settings },
        { type: "createRoom", name: "Sam", settings: room.settings },
      ],
      [
        { kind: "join", code: "BKTZ", name: "sam" },
        { type: "joinRoom", code: "BKTZ", name: "sam", sessionToken: "saved" },
      ],
      [
        { kind: "join", code: "BKTZ", name: "Noor" },
        { type: "joinRoom", code: "BKTZ", name: "Noor", sessionToken: null },
      ],
      [
        { kind: "watch", code: "BKTZ" },
        { type: "watchRoom", code: "BKTZ", sessionToken: null },
      ],
    ] as const) {
      const { socket } = connect(intent, tokens);
      socket().open();
      expect(socket().sent).toEqual([hello]);
    }
  });

  it("does nothing until started, and starts again after close", () => {
    const idle = new RoomConnection({ kind: "watch", code: "BKTZ" }, { createSocket: () => new FakeSocket() });
    expect(idle.getState().status).toBe("connecting");

    const { connection } = connect({ kind: "join", code: "BKTZ", name: "Sam" });
    expect(sockets).toHaveLength(1);
    connection.start();
    expect(sockets).toHaveLength(1);
    connection.close();
    connection.start();
    expect(sockets).toHaveLength(2);
    expect(connection.getState().status).toBe("connecting");
  });

  it("becomes joined, keeps the room state and stores the session token for that name", () => {
    const { connection, tokens, socket } = connect({ kind: "create", name: "Sam" });
    const listener = vi.fn();
    connection.subscribe(listener);
    expect(connection.getState().status).toBe("connecting");

    socket().open();
    socket().receive(joined());
    expect(connection.getState()).toMatchObject({ status: "joined", you: 1, room: { code: "BKTZ" } });
    expect(tokens.get("BKTZ", "Sam")).toBe("token-1");
    expect(tokens.get("BKTZ", "Noor")).toBeNull();
    expect(listener).toHaveBeenCalled();
  });

  it("only sends once joined", () => {
    const { connection, socket } = connect({ kind: "join", code: "BKTZ", name: "Sam" });
    expect(connection.send({ type: "startRound" })).toBe(false);
    socket().open();
    expect(connection.send({ type: "startRound" })).toBe(false);

    socket().receive(joined());
    expect(connection.send({ type: "startRound" })).toBe(true);
    expect(socket().sent.at(-1)).toEqual({ type: "startRound" });
  });

  it("gives up when the room can't be joined", () => {
    const { connection, socket } = connect({ kind: "join", code: "ZZZZ", name: "Sam" });
    socket().open();
    socket().receive({ type: "rejected", reason: "roomNotFound" });
    expect(connection.getState()).toMatchObject({ status: "failed", failure: "roomNotFound" });
    expect(socket().closed).toBe(true);

    advance(60_000);
    expect(sockets).toHaveLength(1);
  });

  it("tries again when the hello gets no answer", () => {
    const { connection, socket } = connect({ kind: "join", code: "BKTZ", name: "Sam" });
    socket().open();
    advance(RoomConnectionTiming.helloTimeoutMs);
    expect(sockets[0]!.closed).toBe(true);
    expect(connection.getState().status).toBe("connecting");

    advance(RoomConnection.backoff(0, 1));
    expect(sockets).toHaveLength(2);
  });

  it("tries again when a socket never even opens", () => {
    connect({ kind: "create", name: "Sam" });
    advance(RoomConnectionTiming.helloTimeoutMs + RoomConnection.backoff(0, 1));
    expect(sockets).toHaveLength(2);
  });

  it("stops instead of creating a second room when a create drops after its hello", () => {
    const { connection, socket } = connect({ kind: "create", name: "Sam" });
    socket().open();
    socket().drop();
    expect(connection.getState()).toMatchObject({ status: "failed", failure: null });
    advance(60_000);
    expect(sockets).toHaveLength(1);
  });
});

describe("RoomConnection: hosting on a screen", () => {
  const hostJoined: ServerMessage = {
    type: "joined",
    serverVersion: "dev",
    you: null,
    sessionToken: "screen-token",
    room: { ...room, hostId: null, hostScreen: "Joris" },
  };

  it("hosts a new room, then takes the host role back with its token after a reload or a drop", () => {
    const tokens = SessionTokenUtils.memory();
    const { socket } = connect({ kind: "host", name: "Joris", settings: room.settings }, tokens);
    socket().open();
    expect(socket().sent).toEqual([{ type: "hostRoom", name: "Joris", settings: room.settings }]);
    socket().receive(hostJoined);

    socket().drop();
    advance(RoomConnection.backoff(0, 1));
    socket().open();
    expect(socket().sent).toEqual([{ type: "watchRoom", code: "BKTZ", sessionToken: "screen-token" }]);

    const reloaded = connect({ kind: "watch", code: "BKTZ" }, tokens);
    reloaded.socket().open();
    expect(reloaded.socket().sent).toEqual([{ type: "watchRoom", code: "BKTZ", sessionToken: "screen-token" }]);
  });

  it("never makes a second room when the first hello drops", () => {
    const { connection, socket } = connect({ kind: "host", name: "Joris" });
    socket().open();
    socket().drop();
    expect(connection.getState().status).toBe("failed");
  });

  it("just watches a room it doesn't host", () => {
    const { socket } = connect({ kind: "watch", code: "BKTZ" });
    socket().open();
    expect(socket().sent).toEqual([{ type: "watchRoom", code: "BKTZ", sessionToken: null }]);
  });
});

describe("RoomConnection: staying connected", () => {
  it("reconnects with backoff and takes the seat back with the token", () => {
    const { connection, socket } = connect({ kind: "create", name: "Sam" });
    socket().open();
    socket().receive(joined("seat"));

    socket().drop();
    expect(connection.getState().status).toBe("reconnecting");
    expect(connection.getState().room?.code).toBe("BKTZ");
    expect(sockets).toHaveLength(1);

    advance(RoomConnection.backoff(0, 1) - 1);
    expect(sockets).toHaveLength(1);
    advance(1);
    expect(sockets).toHaveLength(2);

    socket().open();
    expect(socket().sent).toEqual([{ type: "joinRoom", code: "BKTZ", name: "Sam", sessionToken: "seat" }]);
    socket().receive(joined("seat"));
    expect(connection.getState().status).toBe("joined");
  });

  it("waits longer after every failed attempt, up to a ceiling", () => {
    const { socket } = connect({ kind: "join", code: "BKTZ", name: "Sam" });
    const delays: number[] = [];
    for (let attempt = 0; attempt < 8; attempt++) {
      socket().drop();
      const before = sockets.length;
      let waited = 0;
      while (sockets.length === before) {
        advance(100);
        waited += 100;
      }
      delays.push(waited);
    }
    expect(delays).toEqual([500, 1_000, 2_000, 4_000, 8_000, 10_000, 10_000, 10_000]);
    expect(RoomConnection.backoff(3, 0)).toBe(2_000);
  });

  it("pings while joined and reconnects when a ping goes unanswered", () => {
    const { connection, socket } = joinedConnection();
    advance(RoomConnectionTiming.pingEveryMs);
    expect(socket().sent.at(-1)).toEqual({ type: "ping" });
    socket().receive({ type: "pong" });

    advance(RoomConnectionTiming.pingEveryMs);
    expect(connection.getState().status).toBe("joined");
    advance(RoomConnectionTiming.pingEveryMs);
    expect(connection.getState().status).toBe("reconnecting");
    expect(sockets[0]!.closed).toBe(true);
  });

  it("keeps a healthy socket in a background tab whose timers run once a minute", () => {
    const ticks: (() => void)[] = [];
    vi.spyOn(globalThis, "setInterval").mockImplementation((tick) => {
      ticks.push(tick as () => void);
      return 0 as unknown as ReturnType<typeof setInterval>;
    });
    const { connection, socket } = joinedConnection();
    const tick = ticks.at(-1)!;
    for (let minute = 0; minute < 10; minute++) {
      now += 60_000;
      tick();
      socket().receive({ type: "pong" });
    }
    expect(connection.getState().status).toBe("joined");
    expect(sockets).toHaveLength(1);
  });

  it("stops when another device takes over the seat", () => {
    const { connection, socket } = joinedConnection();
    socket().receive({ type: "rejected", reason: "replaced" });
    socket().drop();
    expect(connection.getState().status).toBe("replaced");
    advance(60_000);
    expect(sockets).toHaveLength(1);
  });

  it("keeps playing after a rejection that isn't about joining", () => {
    const { connection, socket } = joinedConnection();
    socket().receive({ type: "rejected", reason: "notHost" });
    expect(connection.getState()).toMatchObject({ status: "joined", rejection: { reason: "notHost" } });
  });

  it("closes for good when asked", () => {
    const { connection, socket } = joinedConnection();
    connection.close();
    expect(connection.getState().status).toBe("closed");
    expect(socket().closed).toBe(true);
    advance(60_000);
    expect(sockets).toHaveLength(1);
  });

  it("ignores frames that aren't JSON text", () => {
    const { connection, socket } = connect({ kind: "join", code: "BKTZ", name: "Sam" });
    socket().open();
    socket().onmessage?.call(socket() as unknown as WebSocket, new MessageEvent("message", { data: "not json" }));
    expect(connection.getState().room).toBeNull();
  });

  it("builds the socket URL from the page", () => {
    expect(RoomConnection.defaultUrl({ protocol: "https:", host: "bamdoodle.io" })).toBe("wss://bamdoodle.io/ws");
    expect(RoomConnection.defaultUrl({ protocol: "http:", host: "localhost:5173" })).toBe("ws://localhost:5173/ws");
  });
});

describe("RoomConnection: your vote", () => {
  function voting() {
    const opened = joinedConnection();
    opened.socket().receive({ type: "roundStarted", round });
    opened.socket().receive({ type: "votingStarted", durationMs: 30_000 });
    return opened;
  }
  const yourVote = (connection: RoomConnection) => RoomStateUtils.round(connection.getState())?.yourVote;

  it("is remembered once the server confirms it", () => {
    const { connection, socket } = voting();
    connection.send({ type: "castVote", suspectId: 3 });
    socket().receive({ type: "voteCast", voterId: 1 });
    expect(yourVote(connection)).toBe(3);
  });

  it("is the latest one, like on the server, even when you change it before the first one is confirmed", () => {
    const { connection, socket } = voting();
    connection.send({ type: "castVote", suspectId: 2 });
    connection.send({ type: "castVote", suspectId: 3 });
    socket().receive({ type: "voteCast", voterId: 1 });
    socket().receive({ type: "voteCast", voterId: 1 });
    expect(yourVote(connection)).toBe(3);
  });

  it("is forgotten when the server didn't count it", () => {
    const { connection, socket } = voting();
    connection.send({ type: "castVote", suspectId: 2 });
    socket().receive({ type: "rejected", reason: "wrongPhase" });
    expect(connection.getState().pendingVote).toBeNull();

    connection.send({ type: "castVote", suspectId: 3 });
    socket().receive({ type: "revealed", reveal: { bamboozlerId: 2, votes: [], guessRemainingMs: 20_000 } });
    expect(connection.getState().pendingVote).toBeNull();
  });
});

describe("RoomConnection: your avatar", () => {
  const face: AvatarStroke[] = [{ colour: "#ffffff", pressure: false, points: [[0.5, 0.5, 0.5]] }];
  const other: AvatarStroke[] = [{ colour: "#fbb03b", pressure: true, points: [[0.25, 0.5, 0.5]] }];
  const avatarsSent = (socket: FakeSocket) => socket.sent.filter((message) => message.type === "setAvatar");

  it("goes out once the edits pause, as one message", () => {
    const { connection, socket } = joinedConnection();
    connection.setAvatar(face);
    advance(RoomConnectionTiming.avatarDebounceMs - 1);
    connection.setAvatar(other);
    advance(RoomConnectionTiming.avatarDebounceMs - 1);
    expect(avatarsSent(socket())).toEqual([]);
    advance(1);
    expect(avatarsSent(socket())).toEqual([{ type: "setAvatar", strokes: other }]);
  });

  it("goes out right away when flushed, but never twice within the server's cooldown", () => {
    const { connection, socket } = joinedConnection();
    connection.setAvatar(face);
    connection.flushAvatar();
    advance(0);
    expect(avatarsSent(socket())).toEqual([{ type: "setAvatar", strokes: face }]);

    connection.setAvatar(other);
    connection.flushAvatar();
    advance(RoomConnectionTiming.avatarCooldownMs - 1);
    expect(avatarsSent(socket())).toHaveLength(1);
    advance(1);
    expect(avatarsSent(socket())).toEqual([
      { type: "setAvatar", strokes: face },
      { type: "setAvatar", strokes: other },
    ]);
    connection.flushAvatar();
    advance(RoomConnectionTiming.avatarCooldownMs);
    expect(avatarsSent(socket())).toHaveLength(2);
  });

  it("waits for the room when set before joining or while reconnecting", () => {
    const { connection, socket } = connect({ kind: "join", code: "BKTZ", name: "Sam" });
    connection.setAvatar(face);
    advance(RoomConnectionTiming.avatarDebounceMs);
    socket().open();
    socket().receive(joined());
    advance(0);
    expect(avatarsSent(socket())).toEqual([{ type: "setAvatar", strokes: face }]);

    socket().drop();
    connection.setAvatar(other);
    advance(RoomConnection.backoff(0, 1));
    socket().open();
    socket().receive(joined());
    advance(RoomConnectionTiming.avatarCooldownMs);
    expect(avatarsSent(socket())).toEqual([{ type: "setAvatar", strokes: other }]);
  });

  it("goes out during a round too, so a face finished as the host starts still arrives", () => {
    const { connection, socket } = joinedConnection();
    connection.setAvatar(face);
    advance(RoomConnectionTiming.avatarDebounceMs - 1);
    socket().receive({ type: "roundStarted", round });
    advance(RoomConnectionTiming.avatarDebounceMs);
    expect(avatarsSent(socket())).toEqual([{ type: "setAvatar", strokes: face }]);
  });

  it("waits while the connection is closed and goes out on joining again", () => {
    const { connection, socket } = joinedConnection();
    connection.setAvatar(face);
    connection.close();
    advance(RoomConnectionTiming.avatarDebounceMs);
    expect(avatarsSent(socket())).toEqual([]);

    connection.start();
    socket().open();
    socket().receive(joined());
    advance(0);
    expect(avatarsSent(socket())).toEqual([{ type: "setAvatar", strokes: face }]);
  });
});

describe("RoomConnection: ready", () => {
  const readySent = (socket: FakeSocket) => socket.sent.filter((message) => message.type === "ready");

  it("goes out right away when joined", () => {
    const { connection, socket } = joinedConnection();
    connection.markReady();
    expect(readySent(socket())).toEqual([{ type: "ready" }]);
  });

  it("goes out on joining when said while reconnecting, and again on every join after, so a new seat hears it", () => {
    const { connection, socket } = joinedConnection();
    socket().drop();
    connection.markReady();
    advance(RoomConnection.backoff(0, 1));
    socket().open();
    socket().receive(joined());
    expect(readySent(socket())).toEqual([{ type: "ready" }]);

    socket().drop();
    advance(RoomConnection.backoff(0, 1));
    socket().open();
    socket().receive(joined("new-seat"));
    expect(readySent(socket())).toEqual([{ type: "ready" }]);
  });

  it("stays quiet on joining before you said it", () => {
    const { socket } = joinedConnection();
    expect(readySent(socket())).toEqual([]);
  });
});

describe("RoomConnection: releases and closed rooms", () => {
  const flush = () => vi.advanceTimersByTimeAsync(0);

  it("reloads before saying hello when the server runs another release", async () => {
    const onNewVersion = vi.fn(() => true);
    const fetchVersion = vi.fn(async () => "v0.2.0");
    const { socket } = connect({ kind: "create", name: "Sam" }, undefined, {
      appVersion: "v0.1.0",
      fetchVersion,
      onNewVersion,
    });
    socket().open();
    await flush();
    expect(fetchVersion).toHaveBeenCalledWith("ws://test/ws");
    expect(onNewVersion).toHaveBeenCalledWith("v0.2.0");
    expect(socket().sent).toEqual([]);
  });

  it("carries on when the reload is skipped, the version matches, the server is local or can't be asked", async () => {
    for (const [serverVersion, reloads] of [
      ["v0.2.0", false],
      ["v0.1.0", true],
      ["dev", true],
      [null, true],
    ] as const) {
      const onNewVersion = vi.fn(() => reloads);
      const { socket } = connect({ kind: "join", code: "BKTZ", name: "Sam" }, undefined, {
        appVersion: "v0.1.0",
        fetchVersion: async () => serverVersion,
        onNewVersion,
      });
      socket().open();
      await flush();
      expect(socket().sent).toEqual([{ type: "joinRoom", code: "BKTZ", name: "Sam", sessionToken: null }]);
    }
  });

  it("doesn't ask at all in a local build", () => {
    const fetchVersion = vi.fn(async () => "v0.2.0");
    const { socket } = connect({ kind: "watch", code: "BKTZ" }, undefined, { appVersion: "dev", fetchVersion });
    socket().open();
    expect(fetchVersion).not.toHaveBeenCalled();
    expect(socket().sent).toEqual([{ type: "watchRoom", code: "BKTZ", sessionToken: null }]);
  });

  it("calls a release outdated only when both sides are real releases and differ", () => {
    expect(RoomConnection.outdated("v0.1.0", "v0.2.0")).toBe(true);
    expect(RoomConnection.outdated("v0.2.0", "v0.2.0")).toBe(false);
    expect(RoomConnection.outdated("dev", "v0.2.0")).toBe(false);
    expect(RoomConnection.outdated("v0.1.0", "dev")).toBe(false);
    expect(RoomConnection.outdated("v0.1.0", null)).toBe(false);
  });

  it("reloads at most once per release", () => {
    const items = new Map<string, string>();
    const reload = vi.fn();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
    });
    vi.stubGlobal("location", { reload });
    expect(RoomConnection.reloadOnce("v0.2.0")).toBe(true);
    expect(RoomConnection.reloadOnce("v0.2.0")).toBe(false);
    expect(RoomConnection.reloadOnce("v0.3.0")).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);

    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(RoomConnection.reloadOnce("v0.4.0")).toBe(false);
    vi.unstubAllGlobals();
  });

  it("stops for good when the room is closed for inactivity", () => {
    const { connection, socket } = joinedConnection();
    socket().receive({ type: "rejected", reason: "roomClosed" });
    socket().drop();
    expect(connection.getState()).toMatchObject({ status: "failed", failure: "roomClosed" });
    advance(60_000);
    expect(sockets).toHaveLength(1);
  });
});

describe("SessionTokenUtils.browser", () => {
  it("works without storage", () => {
    const broken = SessionTokenUtils.browser(() => {
      throw new Error("blocked");
    });
    broken.set("BKTZ", "Sam", "token");
    expect(broken.get("BKTZ", "Sam")).toBeNull();

    const missing = SessionTokenUtils.browser(() => undefined);
    expect(missing.get("BKTZ", "Sam")).toBeNull();
  });

  it("keeps one seat per room, for the name it was for", () => {
    const items = new Map<string, string>();
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
    };
    const tokens = SessionTokenUtils.browser(() => storage as unknown as Storage);
    tokens.set("bktz", "Sam", "token");
    expect(tokens.get("BKTZ", " SAM ")).toBe("token");
    expect(tokens.get("BKTZ", "Noor")).toBeNull();
  });
});
