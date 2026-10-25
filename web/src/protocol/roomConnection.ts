import type { AvatarStroke } from "@/protocol/generated/AvatarStroke";
import type { ClientMessage } from "@/protocol/generated/ClientMessage";
import type { RejectReason } from "@/protocol/generated/RejectReason";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
import type { ServerMessage } from "@/protocol/generated/ServerMessage";
import { type RoomState, RoomStateUtils } from "@/protocol/roomState.utils";
import { type SessionTokenStore, SessionTokenUtils } from "@/protocol/sessionTokens.utils";
import { APP_VERSION } from "@/protocol/version";

export type RoomIntent =
  /** With the settings picked before the room existed. */
  | { kind: "create"; name: string; settings?: RoomSettings }
  | { kind: "join"; code: string; name: string }
  | { kind: "watch"; code: string };

export type SocketLike = Pick<WebSocket, "readyState" | "send" | "close" | "onopen" | "onmessage" | "onclose">;

export type RoomConnectionOptions = {
  url?: string;
  createSocket?: (url: string) => SocketLike;
  tokens?: SessionTokenStore;
  /** For tests: the jitter in reconnect delays and the clock used for timers. */
  random?: () => number;
  now?: () => number;
  /**
   * The release this app was built for; how to ask the server for its own; and what to do when they differ: by
   * default reload once, returning whether it did (if not, the connection just carries on).
   */
  appVersion?: string;
  fetchVersion?: (url: string) => Promise<string | null>;
  onNewVersion?: (serverVersion: string) => boolean;
};

export const RoomConnectionTiming = {
  backoffBaseMs: 500,
  backoffMaxMs: 10_000,
  pingEveryMs: 15_000,
  /** A ping with nothing at all coming back this long after it means the socket is dead (sleeping phones). */
  pongTimeoutMs: 10_000,
  /** The server gives a new connection the same time to say which room it wants. */
  helloTimeoutMs: 10_000,
  /** Quiet time after the last avatar edit before it goes out, so the room hears about a face, not every stroke. */
  avatarDebounceMs: 1_000,
  /** The server drops a second avatar from the same player within a second (`limits::AVATAR_COOLDOWN`); with slack. */
  avatarCooldownMs: 1_250,
} as const;

/** Reasons that mean trying again won't help. */
const fatalBeforeJoining: ReadonlySet<RejectReason> = new Set([
  "roomNotFound",
  "roomFull",
  "tooManyRooms",
  "invalidName",
  "nameTaken",
  "notJoined",
]);

const OPEN = 1;

/**
 * One device's connection to a room. Says hello (create, join or watch), keeps the session token, reconnects with
 * backoff when the connection drops, and keeps a `RoomState` up to date that the UI can subscribe to. Nothing
 * happens until `start()`.
 */
export class RoomConnection {
  #intent: RoomIntent;
  readonly #url: string | undefined;
  readonly #createSocket: (url: string) => SocketLike;
  readonly #tokens: SessionTokenStore;
  readonly #random: () => number;
  readonly #now: () => number;
  readonly #appVersion: string;
  readonly #fetchVersion: (url: string) => Promise<string | null>;
  readonly #onNewVersion: (serverVersion: string) => boolean;

  #state: RoomState = RoomStateUtils.initial();
  #listeners = new Set<() => void>();
  #socket: SocketLike | null = null;
  #helloSent = false;
  #attempt = 0;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #helloTimer: ReturnType<typeof setTimeout> | null = null;
  #heartbeat: ReturnType<typeof setInterval> | null = null;
  #lastMessageAt = 0;
  #lastPingAt: number | null = null;
  #avatar: AvatarStroke[] | null = null;
  #avatarTimer: ReturnType<typeof setTimeout> | null = null;
  #avatarSentAt = Number.NEGATIVE_INFINITY;
  #ready = false;

  constructor(intent: RoomIntent, options: RoomConnectionOptions = {}) {
    this.#intent = intent;
    this.#url = options.url;
    this.#createSocket = options.createSocket ?? ((url) => new WebSocket(url));
    this.#tokens = options.tokens ?? SessionTokenUtils.browser();
    this.#random = options.random ?? Math.random;
    // Wall-clock time: performance.now() stops while a phone sleeps, which would hide how long it was away.
    this.#now = options.now ?? Date.now;
    this.#appVersion = options.appVersion ?? APP_VERSION;
    this.#fetchVersion = options.fetchVersion ?? RoomConnection.fetchServerVersion;
    this.#onNewVersion = options.onNewVersion ?? RoomConnection.reloadOnce;
  }

  /** `/api/version` next to the socket's `/ws`, or null when it can't be read. */
  static async fetchServerVersion(socketUrl: string): Promise<string | null> {
    try {
      const url = socketUrl.replace(/^ws/, "http").replace(/\/ws$/, "/api/version");
      const response = await fetch(url, { cache: "no-store" });
      return response.ok ? (await response.text()).trim() : null;
    } catch {
      return null;
    }
  }

  /** The server runs another release than this app; local builds never count. */
  static outdated(appVersion: string, serverVersion: string | null): serverVersion is string {
    return appVersion !== "dev" && serverVersion !== null && serverVersion !== "dev" && serverVersion !== appVersion;
  }

  /** Before work a reload would throw away (setting up a room): reloads now when a new release is out. */
  static async reloadIfOutdated(): Promise<boolean> {
    if (APP_VERSION === "dev") return false;
    const serverVersion = await RoomConnection.fetchServerVersion(RoomConnection.defaultUrl());
    return RoomConnection.outdated(APP_VERSION, serverVersion) && RoomConnection.reloadOnce(serverVersion);
  }

  /** Reloads to fetch the new release, at most once per version so a stale cache can never loop. */
  static reloadOnce(serverVersion: string): boolean {
    const key = "bamdoodle:reloaded-for";
    try {
      if (globalThis.sessionStorage?.getItem(key) === serverVersion) return false;
      globalThis.sessionStorage?.setItem(key, serverVersion);
    } catch {
      return false;
    }
    if (!globalThis.location) return false;
    globalThis.location.reload();
    return true;
  }

  static defaultUrl(location: Pick<Location, "protocol" | "host"> = globalThis.location): string {
    return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
  }

  /** Exponential, capped, with jitter so a room full of phones doesn't reconnect in lockstep. */
  static backoff(attempt: number, random: number): number {
    const ceiling = Math.min(RoomConnectionTiming.backoffMaxMs, RoomConnectionTiming.backoffBaseMs * 2 ** attempt);
    return Math.round(ceiling * (0.5 + random / 2));
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  readonly getState = (): RoomState => this.#state;

  /** Connects, or connects again after `close()` (React runs effects twice in development). */
  start(): void {
    if (this.#socket !== null || this.#reconnectTimer !== null) return;
    this.#attempt = 0;
    this.#update(RoomStateUtils.withStatus(this.#state, this.#state.room ? "reconnecting" : "connecting"));
    this.#open();
  }

  /** Sends when joined; returns `false` (and drops the message) while connecting or reconnecting. */
  send(message: ClientMessage): boolean {
    if (this.#state.status !== "joined" || this.#socket?.readyState !== OPEN) return false;
    this.#socket.send(JSON.stringify(message));
    // Another tap changes your vote, on the server too: the latest one is the one to remember.
    if (message.type === "castVote") {
      this.#update(RoomStateUtils.withPendingVote(this.#state, message.suspectId));
    }
    return true;
  }

  /** Your avatar changed: it goes to the room once the edits pause (`AvatarUtils.toWire` makes the strokes). */
  setAvatar(strokes: AvatarStroke[]): void {
    this.#avatar = strokes;
    this.#scheduleAvatar(RoomConnectionTiming.avatarDebounceMs);
  }

  /** Sends an avatar still waiting for its debounce as soon as the server takes it: when you leave the lobby. */
  flushAvatar(): void {
    if (this.#avatar !== null) this.#scheduleAvatar(0);
  }

  /** Done with your face: the host stops waiting for you. Said again on every join, so a new seat hears it too. */
  markReady(): void {
    this.#ready = true;
    this.send({ type: "ready" });
  }

  /** Leaves for good: no reconnects (until `start()` again). */
  close(): void {
    this.#stop("closed");
  }

  #open(): void {
    const socket = this.#createSocket(this.#url ?? RoomConnection.defaultUrl());
    this.#socket = socket;
    this.#helloSent = false;
    socket.onopen = () => {
      this.#lastMessageAt = this.#now();
      void this.#sayHello(socket);
    };
    socket.onmessage = (event) => this.#receive(event.data);
    socket.onclose = () => {
      if (this.#socket === socket) this.#lost();
    };
    // A half-up network can leave a socket connecting, or open but unanswered, for minutes.
    this.#helloTimer = setTimeout(() => {
      this.#helloTimer = null;
      if (this.#socket === socket && this.#state.status !== "joined") this.#lost();
    }, RoomConnectionTiming.helloTimeoutMs);
  }

  /**
   * Checks the server's release before the hello, so an old app reloads before it creates or joins anything (after a
   * deploy, an open tab's reconnect lands here too). A local build skips the check.
   */
  async #sayHello(socket: SocketLike): Promise<void> {
    if (this.#appVersion !== "dev") {
      const serverVersion = await this.#fetchVersion(this.#url ?? RoomConnection.defaultUrl());
      if (this.#socket !== socket) return;
      if (RoomConnection.outdated(this.#appVersion, serverVersion) && this.#onNewVersion(serverVersion)) return;
    }
    this.#helloSent = true;
    socket.send(JSON.stringify(this.#hello()));
  }

  #hello(): ClientMessage {
    switch (this.#intent.kind) {
      case "create":
        return { type: "createRoom", name: this.#intent.name, settings: this.#intent.settings ?? null };
      case "join":
        return {
          type: "joinRoom",
          code: this.#intent.code,
          name: this.#intent.name,
          sessionToken: this.#tokens.get(this.#intent.code, this.#intent.name),
        };
      case "watch":
        return { type: "watchRoom", code: this.#intent.code };
    }
  }

  #receive(data: unknown): void {
    if (typeof data !== "string") return;
    let message: ServerMessage;
    try {
      message = JSON.parse(data) as ServerMessage;
    } catch {
      return;
    }
    this.#lastMessageAt = this.#now();

    if (message.type === "rejected" && message.reason === "replaced") {
      this.#stop("replaced");
      return;
    }
    if (message.type === "rejected" && message.reason === "roomClosed") {
      this.#update(RoomStateUtils.apply(this.#state, message, this.#now()));
      this.#stop("failed", "roomClosed");
      return;
    }
    if (message.type === "rejected" && this.#state.status !== "joined" && fatalBeforeJoining.has(message.reason)) {
      this.#update(RoomStateUtils.apply(this.#state, message, this.#now()));
      this.#stop("failed", message.reason);
      return;
    }

    let state = RoomStateUtils.apply(this.#state, message, this.#now());
    if (message.type === "joined") {
      this.#joined(message.room.code, message.sessionToken);
      state = RoomStateUtils.withStatus(state, "joined");
    }
    this.#update(state);
    if (message.type === "joined" && this.#ready) this.send({ type: "ready" });
  }

  #joined(code: string, sessionToken: string | null): void {
    this.#attempt = 0;
    this.#clearHelloTimer();
    if (this.#intent.kind === "create") this.#intent = { kind: "join", code, name: this.#intent.name };
    if (sessionToken && this.#intent.kind === "join") this.#tokens.set(code, this.#intent.name, sessionToken);
    this.#startHeartbeat();
    // An avatar set while connecting or reconnecting couldn't go out yet.
    this.flushAvatar();
  }

  #scheduleAvatar(delay: number): void {
    this.#clearAvatarTimer();
    const cooldownLeft = this.#avatarSentAt + RoomConnectionTiming.avatarCooldownMs - this.#now();
    this.#avatarTimer = setTimeout(
      () => {
        this.#avatarTimer = null;
        if (this.#avatar === null) return;
        if (this.send({ type: "setAvatar", strokes: this.#avatar })) {
          this.#avatar = null;
          this.#avatarSentAt = this.#now();
        }
      },
      Math.max(delay, cooldownLeft),
    );
  }

  #clearAvatarTimer(): void {
    if (this.#avatarTimer !== null) clearTimeout(this.#avatarTimer);
    this.#avatarTimer = null;
  }

  /** The socket is gone. Try again, unless a create may already have made a room: retrying would make another. */
  #lost(): void {
    if (this.#intent.kind === "create" && this.#helloSent) {
      this.#stop("failed");
      return;
    }
    this.#scheduleReconnect();
  }

  #startHeartbeat(): void {
    this.#stopHeartbeat();
    this.#lastPingAt = null;
    // Judged against the last ping, not the interval: background tabs may only run this once a minute.
    this.#heartbeat = setInterval(() => {
      const now = this.#now();
      const pingAt = this.#lastPingAt;
      const unanswered = pingAt !== null && this.#lastMessageAt < pingAt;
      if (unanswered && now - pingAt >= RoomConnectionTiming.pongTimeoutMs) {
        this.#scheduleReconnect();
        return;
      }
      if (!unanswered && this.#socket?.readyState === OPEN) {
        this.#lastPingAt = now;
        this.#socket.send(JSON.stringify({ type: "ping" } satisfies ClientMessage));
      }
    }, RoomConnectionTiming.pingEveryMs);
  }

  #scheduleReconnect(): void {
    if (this.#reconnectTimer !== null || this.#isFinal()) return;
    this.#dropSocket();
    this.#stopHeartbeat();
    this.#clearHelloTimer();
    this.#update(RoomStateUtils.withStatus(this.#state, this.#state.room ? "reconnecting" : "connecting"));
    const delay = RoomConnection.backoff(this.#attempt, this.#random());
    this.#attempt += 1;
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      this.#open();
    }, delay);
  }

  #stop(status: "closed" | "replaced" | "failed", failure: RejectReason | null = null): void {
    if (this.#reconnectTimer !== null) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
    this.#stopHeartbeat();
    this.#clearHelloTimer();
    this.#clearAvatarTimer();
    this.#dropSocket();
    this.#update(RoomStateUtils.withStatus(this.#state, status, failure));
  }

  #dropSocket(): void {
    const socket = this.#socket;
    this.#socket = null;
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.close();
  }

  #clearHelloTimer(): void {
    if (this.#helloTimer !== null) clearTimeout(this.#helloTimer);
    this.#helloTimer = null;
  }

  #stopHeartbeat(): void {
    if (this.#heartbeat !== null) clearInterval(this.#heartbeat);
    this.#heartbeat = null;
  }

  #isFinal(): boolean {
    return this.#state.status === "closed" || this.#state.status === "replaced" || this.#state.status === "failed";
  }

  #update(state: RoomState): void {
    if (state === this.#state) return;
    this.#state = state;
    for (const listener of this.#listeners) listener();
  }
}
