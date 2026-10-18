import { useEffect, useLayoutEffect, useRef } from "react";
import { LabPhoneFrame } from "@/components/lab/LabPhoneFrame.component";
import { useLabRoom } from "@/components/lab/_hooks/labRoom.hook";
import type { RoomSetup, WordCard } from "@/components/lab/_types/lab.types";
import type { LabView } from "@/components/lab/_utils/labSettings.utils";
import { RoomHostView } from "@/components/room/RoomHostView.component";
import { RoomPlayerView } from "@/components/room/RoomPlayerView.component";
import { useRoomSounds } from "@/components/room/_hooks/roomSounds.hook";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import type { Role } from "@/protocol/generated/Role";

type LabPlaygroundProps = {
  players: RoomPlayer[];
  /** Your seat; the others are simulated. */
  youId: number;
  words: WordCard[];
  roomCode: string;
  setup: RoomSetup;
  /** Play the room-created reveal on the join card. */
  revealCode?: boolean;
  /** Called when the first round starts, e.g. to stop the reveal from playing again. */
  onRoundStart?: () => void;
  view: LabView;
  /** "bamboozler" makes you the bamboozler every round, to try that view. */
  role: Role;
};

const HOME = "/lab?screen=start";

/**
 * A game without a server, shown as a phone, a host screen, or both side by side: the same views as a real room, fed
 * by a simulation. The setup and role are read once: change them by remounting (the lab keys on them).
 */
export function LabPlayground({
  players,
  youId,
  words,
  roomCode,
  setup,
  revealCode = false,
  onRoundStart,
  view,
  role,
}: LabPlaygroundProps) {
  const lab = useLabRoom({ code: roomCode, players, youId, words, setup, youAreBamboozler: role === "bamboozler" });
  const started = lab.player.room.phase.phase !== "lobby";
  const roundStart = useRef(onRoundStart);
  useLayoutEffect(() => {
    roundStart.current = onRoundStart;
  });
  useEffect(() => {
    if (started) roundStart.current?.();
  }, [started]);
  useRoomSounds(lab.player, { musicByDefault: true });
  const yourName = players.find((player) => player.id === youId)?.name;

  const player = (
    <RoomPlayerView
      state={lab.player}
      send={lab.send}
      revealCode={revealCode}
      colours={setup.attribution}
      home={HOME}
    />
  );
  const host = <RoomHostView state={lab.host} revealCode={revealCode} colours={setup.attribution} home={HOME} />;

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
