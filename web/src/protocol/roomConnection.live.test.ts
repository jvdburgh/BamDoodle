// Plays against a real server: `just test-live` starts one and sets BAMDOODLE_SERVER_WS.
import { afterEach, describe, expect, it } from "vitest";
import type { AvatarStroke } from "@/protocol/generated/AvatarStroke";
import { RoomConnection, type RoomIntent } from "@/protocol/roomConnection";
import { type RoomState, RoomStateUtils } from "@/protocol/roomState.utils";
import { SessionTokenUtils } from "@/protocol/sessionTokens.utils";

const url = process.env.BAMDOODLE_SERVER_WS;
const opened: RoomConnection[] = [];

function open(intent: RoomIntent): RoomConnection {
  const connection = new RoomConnection(intent, { url, tokens: SessionTokenUtils.memory() });
  connection.start();
  opened.push(connection);
  return connection;
}

function until(connection: RoomConnection, check: (state: RoomState) => boolean): Promise<RoomState> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`timed out in ${connection.getState().status}`)), 5_000);
    const test = () => {
      if (!check(connection.getState())) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(connection.getState());
    };
    const unsubscribe = connection.subscribe(test);
    test();
  });
}

const phaseOf = (state: RoomState) => state.room?.phase.phase;

afterEach(() => {
  for (const connection of opened.splice(0)) connection.close();
});

describe.skipIf(!url)("RoomConnection against the real server", () => {
  it("plays a round from create to the result", async () => {
    const sam = open({ kind: "create", name: "Sam" });
    const { room } = await until(sam, (state) => state.status === "joined");
    const code = room!.code;

    const noor = open({ kind: "join", code, name: "Noor" });
    const jip = open({ kind: "join", code, name: "Jip" });
    const screen = open({ kind: "watch", code });
    await Promise.all([noor, jip, screen].map((connection) => until(connection, (state) => state.status === "joined")));
    await until(sam, (state) => state.room?.players.length === 3);

    const face = [{ colour: "#fbb03b", pressure: false, points: [[0.25, 0.5, 0.5]] }] satisfies AvatarStroke[];
    noor.setAvatar(face);
    noor.flushAvatar();
    for (const connection of [sam, screen]) {
      await until(
        connection,
        (state) => state.room?.players.find((player) => player.name === "Noor")?.avatar.length === 1,
      );
    }

    sam.send({
      type: "updateSettings",
      settings: { ...sam.getState().room!.settings, mode: "oneStroke", turnsPerPlayer: 1, rounds: 1 },
    });
    await until(screen, (state) => state.room?.settings.turnsPerPlayer === 1);

    sam.send({ type: "startRound" });
    const players = [sam, noor, jip];
    const states = await Promise.all(
      players.map((player) => until(player, (state) => RoomStateUtils.round(state) !== null)),
    );
    const roles = states.map((state) => RoomStateUtils.round(state)!.role);
    expect(roles.filter((role) => role === "bamboozler")).toHaveLength(1);
    const screenRound = RoomStateUtils.round(await until(screen, (state) => RoomStateUtils.round(state) !== null));
    expect(screenRound?.word).toBeNull();

    const bamboozlerIndex = roles.indexOf("bamboozler");
    const bamboozlerId = states[bamboozlerIndex]!.you!;
    const artistIndex = roles.indexOf("artist");
    const artistId = states[artistIndex]!.you!;

    players[artistIndex]!.send({ type: "suspect", suspectId: bamboozlerId });
    await until(screen, (state) => RoomStateUtils.suspicionOf(state, artistId) === bamboozlerId);

    for (let turn = 0; turn < 3; turn++) {
      const activeId = RoomStateUtils.round(screen.getState())!.activePlayerId;
      const drawer = players[states.findIndex((state) => state.you === activeId)]!;
      drawer.send({ type: "beginStroke", colour: "#5651fb", size: "bold", points: [[0.2, 0.2, 0.5]] });
      drawer.send({ type: "extendStroke", points: [[0.4, 0.3, 0.5]] });
      drawer.send({ type: "endStroke" });
      // strokeEnded and turnStarted are separate messages: wait for the turn to move on, not just the stroke.
      await until(screen, (state) => {
        const round = RoomStateUtils.round(state);
        return (
          phaseOf(state) === "voting" || (round?.activePlayerId !== activeId && round?.strokes.length === turn + 1)
        );
      });
    }
    const voting = await until(screen, (state) => phaseOf(state) === "voting");
    expect(RoomStateUtils.round(voting)?.strokes).toHaveLength(3);

    players.forEach((player, index) =>
      player.send({ type: "castVote", suspectId: index === bamboozlerIndex ? artistId : bamboozlerId }),
    );
    await until(screen, (state) => phaseOf(state) === "guessing");

    players[bamboozlerIndex]!.send({ type: "guessWord", guess: "no idea" });
    const finished = await until(sam, (state) => phaseOf(state) === "finished");
    const phase = finished.room!.phase;
    expect(phase.phase === "finished" && phase.result).toMatchObject({ bamboozlerId, gameOver: true });
    expect(finished.room!.players.filter((player) => player.score === 1)).toHaveLength(2);
  });

  it("fails cleanly for a room that doesn't exist", async () => {
    const lost = open({ kind: "join", code: "ZZZZ", name: "Sam" });
    const state = await until(lost, (current) => current.status === "failed");
    expect(state.failure).toBe("roomNotFound");
  });
});
