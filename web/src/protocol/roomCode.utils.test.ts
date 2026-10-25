import { describe, expect, it } from "vitest";
import { RoomCodeUtils } from "@/protocol/roomCode.utils";

describe("RoomCodeUtils", () => {
  it("reads a code in any case, and nothing else", () => {
    expect(RoomCodeUtils.parse("bkZW")).toBe("BKZW");
    expect(RoomCodeUtils.parse("ABCD")).toBeUndefined();
    expect(RoomCodeUtils.parse("BKZWX")).toBeUndefined();
  });

  it("has no letters that read like another", () => {
    for (const lookalike of "CLNQIOUY") expect(RoomCodeUtils.LETTERS).not.toContain(lookalike);
  });

  it("reads a look-alike as the letter it looks like, and drops the ones with no twin", () => {
    expect(RoomCodeUtils.parse("bcnk")).toBe("BGMK");
    expect(RoomCodeUtils.parse("BLZW")).toBeUndefined();
    expect(RoomCodeUtils.parse("BQZW")).toBeUndefined();
    expect(RoomCodeUtils.clean("cn-li q")).toBe("GM");
  });

  it("keeps only code letters while typing", () => {
    expect(RoomCodeUtils.clean("bk-y zwq")).toBe("BKZW");
  });
});
