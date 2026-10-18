import type { Attribution, TurnMode, WordLanguage } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import type { Role } from "@/protocol/generated/Role";

export type LabView = "player" | "host" | "both";

/**
 * What the playground remembers per viewer; the non-default values also go in the URL so a link reproduces them.
 * The room settings (mode, laps, turn length, rounds, colours, language, adults pack) are chosen when creating a
 * room; the rest are testing switches in the Lab panel.
 */
export type LabSettings = {
  /** The create-or-join start page, or straight into the room. */
  screen: "start" | "room";
  mode: TurnMode;
  laps: number;
  turnSeconds: number;
  rounds: number;
  attribution: Attribution;
  language: WordLanguage;
  adults: boolean;
  view: LabView;
  role: Role;
  players: number;
};

const defaults: LabSettings = {
  screen: "start",
  ...RoundUtils.DEFAULT_SETUP,
  view: "player",
  role: "artist",
  players: 6,
};

const choices: { [K in keyof LabSettings]: readonly LabSettings[K][] } = {
  screen: ["start", "room"],
  mode: ["classic", "timed"],
  laps: RoundUtils.LAP_CHOICES,
  turnSeconds: RoundUtils.TURN_SECOND_CHOICES,
  rounds: RoundUtils.ROUND_CHOICES,
  attribution: ["free", "shades"],
  language: ["en", "nl"],
  adults: [false, true],
  view: ["player", "host", "both"],
  role: ["artist", "bamboozler"],
  players: [3, 4, 5, 6],
};

const keys = Object.keys(defaults) as (keyof LabSettings)[];
const numeric = new Set<keyof LabSettings>(["players", "laps", "turnSeconds", "rounds"]);

function pick<K extends keyof LabSettings>(key: K, raw: unknown): LabSettings[K] | undefined {
  let value = raw;
  if (typeof raw === "string" && numeric.has(key)) value = Number(raw);
  if (typeof raw === "string" && key === "adults") value = raw === "true";
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
