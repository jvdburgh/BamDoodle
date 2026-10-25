import { RouteUtils } from "@/app/route.utils";
import type { ClientErrorReport } from "@/protocol/generated/ClientErrorReport";
import { RoomCodeUtils } from "@/protocol/roomCode.utils";
import { APP_VERSION } from "@/protocol/version";

/** Different errors reported per visit; the server also caps the total per minute. */
const MAX_REPORTS = 5;
/** Same as the server: `CLIENT_ERROR_MESSAGE_CHARS` and `CLIENT_ERROR_STACK_CHARS` in limits.rs. */
const MESSAGE_CHARS = 300;
const STACK_CHARS = 2_000;

type Target = Pick<EventTarget, "addEventListener" | "removeEventListener">;

/** Which screen, from the address: never the room code in it. */
function page(pathname: string): ClientErrorReport["page"] {
  const route = RouteUtils.route(pathname);
  if (route.kind === "play") return route.code ? "join" : pathname === "/" ? "start" : "other";
  return route.kind;
}

/** Any host's `/BKZW` path, in any case. */
const CODE_PATH = new RegExp(`/[${RoomCodeUtils.LETTERS}]{${RoomCodeUtils.LENGTH}}\\b`, "gi");

/** A room code in an address becomes CODE: `/BKZW` is `/CODE`, `/watch/BKZW` is `/watch/CODE`. */
const scrub = (text: string) => text.replace(CODE_PATH, "/CODE");

/**
 * The report for an error, or null when it isn't ours to fix: a stack with no frame from this site (an extension's
 * script, whose `moz-extension://<id>` frames would also be an ID across visits). Only our own frames are kept,
 * without the origin, and everything is cut to what the server takes.
 */
function toReport(error: unknown, pathname: string, origin: string): ClientErrorReport | null {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  let stack: string | null = null;
  if (error instanceof Error && error.stack) {
    const ours = error.stack.split("\n").filter((line) => line.includes(origin));
    if (ours.length === 0) return null;
    stack = scrub(ours.join("\n").replaceAll(origin, "")).slice(0, STACK_CHARS);
  }
  return {
    message: scrub(message).slice(0, MESSAGE_CHARS),
    stack,
    version: APP_VERSION,
    page: page(pathname),
  };
}

const beacon = (body: string) =>
  navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));

/**
 * Sends uncaught errors and rejected promises to `/api/client-error`, where the server logs them for Cockpit
 * (decision 0005): each different error once, at most five per visit. Returns a function that stops listening.
 */
function install(
  target: Target = window,
  where: () => Pick<Location, "pathname" | "origin"> = () => window.location,
  send: (body: string) => void = beacon,
): () => void {
  const seen = new Set<string>();
  const handle = (error: unknown) => {
    const { pathname, origin } = where();
    const report = toReport(error, pathname, origin);
    // A script from another origin only says "Script error.": nothing to act on.
    if (!report || report.message === "Script error." || seen.has(report.message) || seen.size >= MAX_REPORTS) {
      return;
    }
    seen.add(report.message);
    try {
      send(JSON.stringify(report));
    } catch {
      // Reporting must never break the game.
    }
  };
  const onError = (event: Event) => handle((event as ErrorEvent).error ?? (event as ErrorEvent).message);
  const onRejection = (event: Event) => handle((event as PromiseRejectionEvent).reason);
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}

export const ErrorReportUtils = { page, toReport, install };
