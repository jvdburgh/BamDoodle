import { useEffect, useLayoutEffect, useRef } from "react";
import { LabPhoneFrame } from "@/components/lab/LabPhoneFrame.component";
import type { LabView } from "@/components/lab/_utils/labSettings.utils";
import { RoomHostView } from "@/components/room/RoomHostView.component";
import { RoomPlayerView } from "@/components/room/RoomPlayerView.component";
import { useRoomSimulation } from "@/components/room/_hooks/roomSimulation.hook";
import type { Attribution, RoomPlayer, Seats, TurnMode } from "@/components/room/_types/room.types";
import { useSoundCues } from "@/components/sound/_hooks/sound.hook";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import type { Role } from "@/protocol/generated/Role";

type LabPlaygroundProps = {
  players: RoomPlayer[];
  /** Your seat when the others are simulated. */
  youId: string;
  words: { category: string; word: string }[];
  roomCode: string;
  /** Play the room-created reveal on the join card. */
  revealCode?: boolean;
  /** Called when the first round starts, e.g. to stop the reveal from playing again. */
  onRoundStart?: () => void;
  view: LabView;
  role: Role;
  mode: TurnMode;
  attribution: Attribution;
  roundSeconds: number;
  seats: Seats;
};

/**
 * A round without a server, shown as a phone, a host screen, or both side by side. Mode, attribution and seats are
 * read once: change them by remounting (the lab keys on them), since they reset the round.
 */
export function LabPlayground({
  players,
  youId,
  words,
  roomCode,
  revealCode = false,
  onRoundStart,
  view,
  role,
  mode,
  attribution,
  roundSeconds,
  seats,
}: LabPlaygroundProps) {
  const you = seats === "shared" ? null : youId;
  const sim = useRoomSimulation({ players, youId: you, words, mode, attribution, roundSeconds });
  const started = sim.round.phase === "drawing";
  const roundStart = useRef(onRoundStart);
  useLayoutEffect(() => {
    roundStart.current = onRoundStart;
  });
  useEffect(() => {
    if (started) roundStart.current?.();
  }, [started]);
  useSoundCues({
    phase: sim.round.phase,
    turnCount: sim.round.turnCount,
    yourTurn: sim.yourTurn,
    turnSeconds: Math.ceil(RoundUtils.turnLeft(sim.round, sim.now) / 1000),
    roundSeconds: Math.ceil(RoundUtils.roundLeft(sim.round, sim.now) / 1000),
  });
  const yourName = players.find((player) => player.id === you)?.name;
  const playing = sim.round.phase === "drawing";

  // Mid-round, leaving (the logo link, reload, closing the tab) asks first, with the browser's own prompt.
  useEffect(() => {
    if (!playing) return;
    const confirmLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", confirmLeave);
    return () => window.removeEventListener("beforeunload", confirmLeave);
  }, [playing]);

  const player = <RoomPlayerView sim={sim} youId={you} role={role} roomCode={roomCode} revealCode={revealCode} />;
  const host = <RoomHostView sim={sim} roomCode={roomCode} revealCode={revealCode} />;

  if (view === "player") return <main>{player}</main>;
  if (view === "host") return <main>{host}</main>;
  return (
    <main className="flex min-h-svh flex-col items-center gap-6 p-4 min-[75rem]:flex-row min-[75rem]:items-start">
      <div className="min-[75rem]:sticky min-[75rem]:top-4">
        <LabPhoneFrame label={yourName ? `${yourName}’s phone` : "The shared phone"}>{player}</LabPhoneFrame>
      </div>
      <section
        aria-label="Host screen"
        className="w-full min-w-0 flex-1 overflow-hidden rounded-[24px] bg-night-deep/40"
      >
        {host}
      </section>
    </main>
  );
}
