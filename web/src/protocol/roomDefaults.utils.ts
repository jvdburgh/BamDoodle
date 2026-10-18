import type { RoomDefaults } from "@/protocol/generated/RoomDefaults";

export const RoomDefaultsUtils = {
  /** What a new room starts with and every category, to set a room up before it exists; null when unreachable. */
  async fetch(fetcher: typeof fetch = globalThis.fetch): Promise<RoomDefaults | null> {
    try {
      const response = await fetcher("/api/room-defaults", { cache: "no-store" });
      return response.ok ? ((await response.json()) as RoomDefaults) : null;
    } catch {
      return null;
    }
  },
};
