import { useState } from "react";
import { useTicker } from "@/components/room/_hooks/ticker.hook";
import type { RoomViewState } from "@/components/room/_types/room.types";
import { ClockUtils } from "@/components/room/_utils/clock.utils";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import { useMusic, useSoundCues } from "@/components/sound/_hooks/sound.hook";
import { MusicUtils } from "@/components/sound/_utils/music.utils";
import { RoomStateUtils } from "@/protocol/roomState.utils";

/**
 * The room's sounds on this device: turns, ticks, time's up, the reveal and how the round went for you, the ending,
 * and the music, softer while someone draws or votes (`musicByDefault`: on a laptop unless switched off, always for
 * the host screen). Mount once per room.
 */
export function useRoomSounds(state: RoomViewState, { musicByDefault = MusicUtils.onByDefault() } = {}) {
  const { phase } = state.room.phase;
  useMusic(MusicUtils.ducked(phase), musicByDefault);
  const round = RoomStateUtils.round(state);
  const [now, setNow] = useState(Date.now);
  useTicker(phase === "drawing" || phase === "voting", setNow, 250);
  const reveal = state.room.phase.phase === "guessing" ? state.room.phase.reveal : null;
  useSoundCues({
    phase,
    turnCount: RoomViewUtils.turnCount(round),
    yourTurn: round?.activePlayerId != null && round.activePlayerId === state.you,
    turnSeconds: Math.ceil(ClockUtils.left(state.timers.turn, now) / 1000),
    voteSeconds: Math.ceil(ClockUtils.left(state.timers.voting, now) / 1000),
    you: state.you,
    role: round?.role ?? null,
    reveal: reveal && round ? { ...reveal, artists: round.turnOrder.length - 1 } : null,
    result: state.room.phase.phase === "finished" ? state.room.phase.result : null,
  });
}
