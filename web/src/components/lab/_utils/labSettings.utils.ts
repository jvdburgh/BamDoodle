import type { Attribution, Seats, TurnMode } from "@/components/room/_types/room.types";
import type { Role } from "@/protocol/generated/Role";

export type LabView = "player" | "host" | "both";

/**
 * What the playground remembers per viewer; the non-default values also go in the URL so a link reproduces them.
 * Mode, attribution and round length are room settings, chosen when creating a room; the rest are testing switches
 * in the Lab panel.
 */
export type LabSettings = {
  /** The create-or-join start page, or straight into the room. */
  screen: "start" | "room";
  mode: TurnMode;
  attribution: Attribution;
  roundSeconds: number;
  view: LabView;
  role: Role;
  seats: Seats;
  players: number;
};

const defaults: LabSettings = {
  screen: "start",
  mode: "classic",
  attribution: "free",
  roundSeconds: 60,
  view: "player",
  role: "artist",
  seats: "simulated",
  players: 6,
};

const choices: { [K in keyof LabSettings]: readonly LabSettings[K][] } = {
  screen: ["start", "room"],
  mode: ["classic", "timed"],
  attribution: ["free", "shades"],
  roundSeconds: [60, 90, 120],
  view: ["player", "host", "both"],
  role: ["artist", "bamboozler"],
  seats: ["simulated", "shared"],
  players: [3, 4, 5, 6],
};

const keys = Object.keys(defaults) as (keyof LabSettings)[];
const numeric = new Set<keyof LabSettings>(["players", "roundSeconds"]);

function pick<K extends keyof LabSettings>(key: K, raw: unknown): LabSettings[K] | undefined {
  const value = numeric.has(key) && typeof raw === "string" ? Number(raw) : raw;
  return (choices[key] as readonly unknown[]).includes(value) ? (value as LabSettings[K]) : undefined;
}

/** Settings from the URL first, then what this viewer stored, then the defaults. Unknown values are ignored. */
function read(search: string, stored: string | null): LabSettings {
  const params = new URLSearchParams(search);
  let saved: Record<string, unknown> = {};
  try {
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    if (parsed && typeof parsed === "object") saved = parsed as Record<string, unknown>;
  } catch {
    // A broken stored value just means defaults.
  }
  const settings = { ...defaults };
  for (const key of keys) {
    const value = pick(key, params.get(key) ?? undefined) ?? pick(key, saved[key]);
    if (value !== undefined) Object.assign(settings, { [key]: value });
  }
  return settings;
}

/** The URL query for the settings that differ from the defaults, keeping unrelated params. */
function toSearch(settings: LabSettings, current = ""): string {
  const params = new URLSearchParams(current);
  for (const key of keys) {
    if (settings[key] === defaults[key]) params.delete(key);
    else params.set(key, String(settings[key]));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const LabSettingsUtils = { defaults, choices, read, toSearch };
