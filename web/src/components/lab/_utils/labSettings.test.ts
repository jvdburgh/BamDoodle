import { describe, expect, it } from "vitest";
import { LabSettingsUtils } from "@/components/lab/_utils/labSettings.utils";

const { defaults, read, toSearch } = LabSettingsUtils;

describe("LabSettingsUtils.read", () => {
  it("falls back to the defaults", () => {
    expect(read("", null)).toEqual(defaults);
  });

  it("uses what the viewer stored", () => {
    expect(read("", JSON.stringify({ font: "dynapuff", players: 3 }))).toMatchObject({ font: "dynapuff", players: 3 });
  });

  it("lets the URL win over storage", () => {
    const stored = JSON.stringify({ view: "host" });
    expect(read("?view=both&players=4", stored)).toMatchObject({ view: "both", players: 4 });
  });

  it("ignores values it doesn't know", () => {
    expect(read("?view=fridge&players=9", JSON.stringify({ font: 42, role: "spy" }))).toEqual(defaults);
  });

  it("survives broken storage", () => {
    expect(read("", "{not json")).toEqual(defaults);
    expect(read("", "null")).toEqual(defaults);
  });
});

describe("LabSettingsUtils.toSearch", () => {
  it("only puts non-default settings in the URL", () => {
    expect(toSearch({ ...defaults, view: "both", players: 4 })).toBe("?view=both&players=4");
    expect(toSearch(defaults)).toBe("");
  });

  it("keeps unrelated params and drops ones back at their default", () => {
    expect(toSearch(defaults, "?debug=1&view=host")).toBe("?debug=1");
  });

  it("round-trips through read", () => {
    const settings = {
      ...defaults,
      attribution: "shades" as const,
      role: "bamboozler" as const,
      surface: "night" as const,
    };
    expect(read(toSearch(settings), null)).toEqual(settings);
  });
});
