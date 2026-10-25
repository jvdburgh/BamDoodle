import { RoomCodeUtils } from "@/protocol/roomCode.utils";

export type Route =
  | { kind: "play"; code?: string }
  | { kind: "watch"; code: string }
  | { kind: "lab" }
  /** An old `/join/BKZW` link: play, and show the short address instead. */
  | { kind: "redirect"; to: string; code: string };

/** Which screen an address opens: `/BKZW` joins that room, `/watch/BKZW` is a host screen, `/lab` the lab. */
function route(pathname: string): Route {
  const [, first = "", second = ""] = pathname.split("/");
  const code = RoomCodeUtils.parse;
  if (first === "lab") return { kind: "lab" };
  if (first === "watch" && code(second)) return { kind: "watch", code: code(second)! };
  if (first === "join" && code(second)) return { kind: "redirect", to: `/${code(second)}`, code: code(second)! };
  return { kind: "play", code: code(first) };
}

/** A room's own address, the one to share: `/BKZW`. */
const roomPath = (code: string) => `/${code}`;

export const RouteUtils = { route, roomPath };
