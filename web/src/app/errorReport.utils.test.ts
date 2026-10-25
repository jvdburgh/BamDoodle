import { describe, expect, it, vi } from "vitest";
import { ErrorReportUtils } from "@/app/errorReport.utils";

const ORIGIN = "https://bamdoodle.io";
const here = (pathname: string) => () => ({ pathname, origin: ORIGIN });
const error = (thrown: unknown) => Object.assign(new Event("error"), { error: thrown, message: String(thrown) });
const rejection = (reason: unknown) => Object.assign(new Event("unhandledrejection"), { reason });
const withStack = (message: string, stack: string) => Object.assign(new TypeError(message), { stack });

describe("ErrorReportUtils", () => {
  it("names the screen, never the room code", () => {
    expect(ErrorReportUtils.page("/")).toBe("start");
    expect(ErrorReportUtils.page("/join/BKZW")).toBe("join");
    expect(ErrorReportUtils.page("/BKZW")).toBe("join");
    const shortLink = withStack("opening bamdoodle.io/BKZW failed", `TypeError\n    at f (${ORIGIN}/assets/a.js:1:2)`);
    expect(ErrorReportUtils.toReport(shortLink, "/BKZW", ORIGIN)?.message).toBe(
      "TypeError: opening bamdoodle.io/CODE failed",
    );
    for (const address of [
      "https://bamdoodle.io/bkzw",
      "http://localhost:8080/BKZW",
      "https://doodle.example.org/BKZW",
    ]) {
      const anyHost = withStack(`open ${address} failed`, `TypeError\n    at f (${ORIGIN}/assets/a.js:1:2)`);
      expect(ErrorReportUtils.toReport(anyHost, "/", ORIGIN)?.message).not.toMatch(/bkzw/i);
    }
    expect(ErrorReportUtils.page("/watch/BKZW")).toBe("watch");
    expect(ErrorReportUtils.page("/lab")).toBe("lab");
    expect(ErrorReportUtils.page("/something")).toBe("other");
    const report = ErrorReportUtils.toReport(
      withStack("loading /join/BKZW failed", `TypeError\n    at load (${ORIGIN}/assets/index.js:1:2) /join/BKZW`),
      "/join/BKZW",
      ORIGIN,
    );
    expect(JSON.stringify(report)).not.toContain("BKZW");
    expect(report?.message).toBe("TypeError: loading /join/CODE failed");
  });

  it("keeps only our own frames, and skips errors with none (an extension's)", () => {
    const mixed = withStack(
      "x is undefined",
      `TypeError: x is undefined\n    at a (moz-extension://1b2c3d4e-0000-4000-8000-000000000000/inject.js:9:9)\n    at b (${ORIGIN}/assets/index-abc.js:1:2)`,
    );
    const report = ErrorReportUtils.toReport(mixed, "/", ORIGIN);
    expect(report?.stack).toBe("    at b (/assets/index-abc.js:1:2)");
    const theirs = withStack("boom", "Error: boom\n    at x (moz-extension://1b2c3d4e/inject.js:1:1)");
    expect(ErrorReportUtils.toReport(theirs, "/", ORIGIN)).toBeNull();
  });

  it("cuts the report to what the server takes, so it's never refused whole", () => {
    const deep = withStack("y".repeat(1_000), `${ORIGIN}/assets/a.js:1:1\n`.repeat(500));
    const report = ErrorReportUtils.toReport(deep, "/", ORIGIN);
    expect(report?.message.length).toBe(300);
    expect(report?.stack?.length).toBeLessThanOrEqual(2_000);
  });

  it("reports uncaught errors and rejections, each once, at most five", () => {
    const target = new EventTarget();
    const send = vi.fn();
    const stop = ErrorReportUtils.install(target, here("/join/BKZW"), send);

    const ours = () => withStack("x is undefined", `TypeError\n    at f (${ORIGIN}/assets/index.js:1:2)`);
    target.dispatchEvent(error(ours()));
    target.dispatchEvent(error(ours()));
    target.dispatchEvent(rejection("fetch failed"));
    target.dispatchEvent(error("Script error."));
    expect(send).toHaveBeenCalledTimes(2);
    expect(JSON.parse(send.mock.calls[0]![0] as string)).toMatchObject({
      message: "TypeError: x is undefined",
      page: "join",
    });

    for (let index = 0; index < 10; index++) target.dispatchEvent(rejection(`reason ${index}`));
    expect(send).toHaveBeenCalledTimes(5);

    stop();
    target.dispatchEvent(rejection("after stop"));
    expect(send).toHaveBeenCalledTimes(5);
  });

  it("never lets a failing send break the page", () => {
    const target = new EventTarget();
    ErrorReportUtils.install(target, here("/"), () => {
      throw new Error("offline");
    });
    expect(() => target.dispatchEvent(rejection("boom"))).not.toThrow();
  });
});
