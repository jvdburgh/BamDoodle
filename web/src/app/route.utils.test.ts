import { describe, expect, it } from "vitest";
import { RouteUtils } from "@/app/route.utils";

describe("RouteUtils.route", () => {
  it("joins a room from its code alone", () => {
    expect(RouteUtils.route("/BKZW")).toEqual({ kind: "play", code: "BKZW" });
    expect(RouteUtils.route("/bkzw")).toEqual({ kind: "play", code: "BKZW" });
  });

  it("keeps the host screen, and the start page for anything else", () => {
    expect(RouteUtils.route("/watch/BKZW")).toEqual({ kind: "watch", code: "BKZW" });
    expect(RouteUtils.route("/join/BKZW")).toEqual({ kind: "play", code: undefined });
    expect(RouteUtils.route("/lab")).toEqual({ kind: "play", code: undefined });
    expect(RouteUtils.route("/")).toEqual({ kind: "play", code: undefined });
    expect(RouteUtils.route("/ABCD")).toEqual({ kind: "play", code: undefined });
    expect(RouteUtils.route("/BKZWX")).toEqual({ kind: "play", code: undefined });
    expect(RouteUtils.route("/join/nope")).toEqual({ kind: "play", code: undefined });
  });

  it("uses the code as the room's address", () => {
    expect(RouteUtils.roomPath("BKZW")).toBe("/BKZW");
  });
});
