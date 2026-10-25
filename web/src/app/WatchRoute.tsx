import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { LobbySetup } from "@/components/lobby/LobbySetup.component";
import { RoomHostView } from "@/components/room/RoomHostView.component";
import { useRoomSounds } from "@/components/room/_hooks/roomSounds.hook";
import type { RoomViewState } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
import { useRoomConnection } from "@/protocol/room.hook";
import type { RoomConnection } from "@/protocol/roomConnection";

/**
 * A screen (TV, beamer, laptop) following a room: it never gets the word and doesn't play. The screen that created
 * the room hosts it, also after a reload (its token is on this device).
 */
export function WatchRoute({ code }: { code: string }) {
  const { connection, state } = useRoomConnection({ kind: "watch", code });

  const failed = state?.status === "failed" || state?.status === "closed";
  if (!failed && connection && RoomViewUtils.inRoom(state)) return <HostRoom state={state} connection={connection} />;

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <BrandLogo href="/" className="size-20" />
      <p className="font-display text-2xl" role={failed ? "alert" : "status"}>
        {failed
          ? state?.failure
            ? RoomViewUtils.problem(state.failure)
            : "Couldn’t reach the game. Check the connection and reload."
          : `Opening room ${code}…`}
      </p>
    </main>
  );
}

type HostRoomProps = {
  state: RoomViewState;
  connection: RoomConnection;
  /** This screen just created the room: play the room-created moment. */
  createdHere?: boolean;
};

/** The room on a big screen; when this screen hosts, with Start round and the settings. */
export function HostRoom({ state, connection, createdHere = false }: HostRoomProps) {
  useRoomSounds(state, { musicByDefault: true });
  const { room } = state;
  const [settingUp, setSettingUp] = useState(false);
  /** What the host is picking; only complete settings go to the server, which sends them back to everyone. */
  const [draft, setDraft] = useState<RoomSettings | null>(null);
  const betweenRounds = room.phase.phase === "lobby" || room.phase.phase === "finished";

  // The address to reload this screen with: as the host again, on this device.
  useEffect(() => {
    const path = `/watch/${room.code}`;
    if (window.location.pathname !== path) window.history.replaceState(null, "", path);
  }, [room.code]);

  if (settingUp && state.hosting && betweenRounds) {
    return (
      <LobbySetup
        roomCode={room.code}
        settings={draft ?? room.settings}
        wordCategories={room.wordCategories}
        onChange={(settings) => {
          setDraft(settings);
          if (settings.categories.length > 0) connection.send({ type: "updateSettings", settings });
        }}
        onDone={() => {
          setSettingUp(false);
          setDraft(null);
        }}
      />
    );
  }

  return (
    <main>
      <RoomHostView
        state={state}
        revealCode={createdHere}
        controls={
          state.hosting
            ? { onStart: () => connection.send({ type: "startRound" }), onSettings: () => setSettingUp(true) }
            : undefined
        }
      />
    </main>
  );
}
