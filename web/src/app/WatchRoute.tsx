import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { RoomHostView } from "@/components/room/RoomHostView.component";
import { useRoomSounds } from "@/components/room/_hooks/roomSounds.hook";
import type { RoomViewState } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import { useRoomConnection } from "@/protocol/room.hook";

/** A host screen (TV, beamer, laptop) following a room: it never gets the word and doesn't play. */
export function WatchRoute({ code }: { code: string }) {
  const { state } = useRoomConnection({ kind: "watch", code });

  const failed = state?.status === "failed" || state?.status === "closed";
  if (!failed && RoomViewUtils.inRoom(state)) return <WatchRoom state={state} />;

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

function WatchRoom({ state }: { state: RoomViewState }) {
  useRoomSounds(state);
  return (
    <main>
      <RoomHostView state={state} />
    </main>
  );
}
