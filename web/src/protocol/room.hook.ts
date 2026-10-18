import { useEffect, useMemo, useSyncExternalStore } from "react";
import { RoomConnection, type RoomIntent } from "@/protocol/roomConnection";
import type { RoomState } from "@/protocol/roomState.utils";

const noSubscription = () => () => {};
const noState = () => null;

/** The live state of a connection; re-renders on every change. */
export function useRoom(connection: RoomConnection | null): RoomState | null {
  return useSyncExternalStore(connection?.subscribe ?? noSubscription, connection?.getState ?? noState);
}

/**
 * Opens a connection for as long as the component is mounted and the intent stays the same; `null` means don't
 * connect yet (no name or code entered). Returns the connection to `send` on and its state.
 */
export function useRoomConnection(intent: RoomIntent | null): {
  connection: RoomConnection | null;
  state: RoomState | null;
} {
  const key = intent && JSON.stringify(intent);
  const connection = useMemo(() => (key ? new RoomConnection(JSON.parse(key) as RoomIntent) : null), [key]);

  useEffect(() => {
    if (!connection) return;
    connection.start();
    return () => connection.close();
  }, [connection]);

  return { connection, state: useRoom(connection) };
}
