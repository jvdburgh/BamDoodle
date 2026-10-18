// Plays against a real server: `just test-live` starts one and sets BAMDOODLE_SERVER_WS.
import { afterEach, describe, expect, it } from "vitest";
import { RoomConnection, type RoomIntent } from "@/protocol/roomConnection";
import type { RoomState } from "@/protocol/roomState.utils";
import { RoomStateUtils } from "@/protocol/roomState.utils";
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

    sam.send({ type: "startRound" });
    const players = [sam, noor, jip];
    const states = await Promise.all(
      players.map((player) => until(player, (state) => RoomStateUtils.round(state) !== null)),
    );
    const roles = states.map((state) => RoomStateUtils.round(state)!.role);
    expect(roles.filter((role) => role === "bamboozler")).toHaveLength(1);
    const screenRound = RoomStateUtils.round(await until(screen, (state) => RoomStateUtils.round(state) !== null));
    expect(screenRound?.word).toBeNull();

    const activeId = RoomStateUtils.round(states[0]!)!.activePlayerId;
    const drawer = players[states.findIndex((state) => state.you === activeId)]!;
    drawer.send({ type: "beginStroke", colour: "#5651fb", size: "bold", points: [[0.2, 0.2, 0.5]] });
    drawer.send({ type: "extendStroke", points: [[0.4, 0.3, 0.5]] });
    drawer.send({ type: "endStroke" });
    const drawn = await until(screen, (state) => RoomStateUtils.round(state)?.strokes[0]?.done === true);
    expect(RoomStateUtils.round(drawn)?.strokes[0]?.points).toHaveLength(2);

    const bamboozlerIndex = roles.indexOf("bamboozler");
    const bamboozlerId = states[bamboozlerIndex]!.you!;
    const artistId = states.find((state) => state.you !== bamboozlerId)!.you!;
    players.forEach((player, index) =>
      player.send({ type: "castVote", suspectId: index === bamboozlerIndex ? artistId : bamboozlerId }),
    );
    await until(screen, (state) => state.room?.phase.phase === "guessing");

    players[bamboozlerIndex]!.send({ type: "guessWord", guess: "no idea" });
    const finished = await until(sam, (state) => state.room?.phase.phase === "finished");
    const phase = finished.room!.phase;
    expect(phase.phase === "finished" && phase.result.bamboozlerId).toBe(bamboozlerId);
    expect(finished.room!.players.filter((player) => player.score === 1)).toHaveLength(2);
  });

  it("fails cleanly for a room that doesn't exist", async () => {
    const lost = open({ kind: "join", code: "ZZZZ", name: "Sam" });
    const state = await until(lost, (current) => current.status === "failed");
    expect(state.failure).toBe("roomNotFound");
  });
});
