import { RoomCodeUtils } from "@/protocol/roomCode.utils";

export type Route = { kind: "play"; code?: string } | { kind: "watch"; code: string };

/** Which screen an address opens: `/BKZW` joins that room, `/watch/BKZW` is a host screen, anything else starts. */
function route(pathname: string): Route {
  const [, first = "", second = ""] = pathname.split("/");
  const code = RoomCodeUtils.parse;
  if (first === "watch" && code(second)) return { kind: "watch", code: code(second)! };
  return { kind: "play", code: code(first) };
}

/** A room's own address, the one to share: `/BKZW`. */
const roomPath = (code: string) => `/${code}`;

export const RouteUtils = { route, roomPath };
