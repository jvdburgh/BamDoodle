import { describe, expect, it } from "vitest";
import { RoomCodeUtils } from "@/protocol/roomCode.utils";

describe("RoomCodeUtils", () => {
  it("reads a code in any case, and nothing else", () => {
    expect(RoomCodeUtils.parse("bkZW")).toBe("BKZW");
    expect(RoomCodeUtils.parse("ABCD")).toBeUndefined();
    expect(RoomCodeUtils.parse("BKZWX")).toBeUndefined();
  });

  it("keeps only code letters while typing", () => {
    expect(RoomCodeUtils.clean("bk-y zwq")).toBe("BKZW");
  });
});
