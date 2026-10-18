import { useMemo, useState } from "react";
import { useRoomDrawing } from "@/components/room/_hooks/roomDrawing.hook";
import { useRoomFeed } from "@/components/room/_hooks/roomFeed.hook";
import { useTicker } from "@/components/room/_hooks/ticker.hook";
import type { Attribution, RoomViewState } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import { usePencilSound } from "@/components/sound/_hooks/pencilSound.hook";
import { RoomStateUtils } from "@/protocol/roomState.utils";

/** A turned-down request stays on screen this long. */
const PROBLEM_MS = 5_000;

/** Everything a room screen reads off the server's state, plus the clock, the shared picture and the table talk. */
export function useRoomView(state: RoomViewState, colours: Attribution) {
  const { room } = state;
  const phase = room.phase.phase;
  const round = RoomStateUtils.round(state);
  const reveal = room.phase.phase === "guessing" ? room.phase.reveal : null;
  const result = room.phase.phase === "finished" ? room.phase.result : null;

  const [now, setNow] = useState(Date.now);
  const problem = state.rejection && now - state.rejection.at < PROBLEM_MS ? state.rejection.reason : null;
  useTicker(phase === "drawing" || phase === "voting" || phase === "guessing" || problem !== null, setNow);

  const { code, players: seats } = room;
  const players = useMemo(() => RoomViewUtils.players({ code, players: seats }), [code, seats]);
  const families = useMemo(() => RoomViewUtils.families(players, colours), [players, colours]);
  const identities = useMemo(() => RoomViewUtils.identities(families), [families]);
  const drawing = useRoomDrawing(round);
  usePencilSound(drawing);
  const feed = useRoomFeed(round, now);

  return {
    room,
    phase,
    round,
    reveal,
    result,
    now,
    /** What the server last turned down, for a few seconds. */
    problem,
    players,
    families,
    identities,
    drawing,
    feed,
    host: players.find((player) => player.id === room.hostId),
    active: RoomViewUtils.active(round, players),
    next: RoomViewUtils.next(round, players),
    /** Layers stack in turn order; between rounds, in seat order. */
    order: round?.turnOrder ?? players.map((player) => player.id),
    roundNumber: round?.number ?? result?.number ?? 0,
    rounds: round?.rounds ?? result?.rounds ?? room.settings.rounds,
    category: round?.category ?? result?.category ?? null,
    bamboozlerId: reveal?.bamboozlerId ?? result?.bamboozlerId ?? null,
    gameOver: result?.gameOver ?? false,
  };
}
