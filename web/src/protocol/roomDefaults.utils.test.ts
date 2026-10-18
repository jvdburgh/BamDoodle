import { describe, expect, it } from "vitest";
import { RoomDefaultsUtils } from "./roomDefaults.utils";
import type { RoomDefaults } from "@/protocol/generated/RoomDefaults";

const defaults: RoomDefaults = {
  settings: {
    mode: "oneStroke",
    turnsPerPlayer: 3,
    turnSeconds: 20,
    rounds: 5,
    language: "en",
    categories: ["Animals"],
  },
  wordCategories: [{ name: "Animals", language: "en", adult: false, words: 120 }],
};

describe("RoomDefaultsUtils.fetch", () => {
  it("reads the defaults", async () => {
    const fetcher = async () => new Response(JSON.stringify(defaults));
    await expect(RoomDefaultsUtils.fetch(fetcher as typeof fetch)).resolves.toEqual(defaults);
  });

  it("gives null when the server can't be reached or says no", async () => {
    const offline = async () => {
      throw new TypeError("NetworkError");
    };
    const failing = async () => new Response("nope", { status: 500 });
    await expect(RoomDefaultsUtils.fetch(offline as typeof fetch)).resolves.toBeNull();
    await expect(RoomDefaultsUtils.fetch(failing as typeof fetch)).resolves.toBeNull();
  });
});
