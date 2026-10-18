import type { Attribution, TurnMode, WordLanguage } from "@/components/room/_types/room.types";
import { RoundUtils } from "@/components/room/_utils/round.utils";
import type { Role } from "@/protocol/generated/Role";

export type LabView = "player" | "host" | "both";

/**
 * What the playground remembers per viewer; the non-default values also go in the URL so a link reproduces them.
 * The room settings (mode, turns per player, turn length, rounds, colours, language, categories) are chosen when creating a
 * room; the rest are testing switches in the Lab panel.
 */
export type LabSettings = {
  /** The create-or-join start page, or straight into the room. */
  screen: "start" | "room";
  mode: TurnMode;
  turnsPerPlayer: number;
  turnSeconds: number;
  rounds: number;
  attribution: Attribution;
  language: WordLanguage;
  /** Category names in play; empty means the language's defaults (everything but 18+). */
  categories: string[];
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
  turnsPerPlayer: RoundUtils.TURNS_PER_PLAYER_CHOICES,
  turnSeconds: RoundUtils.TURN_SECOND_CHOICES,
  rounds: RoundUtils.ROUND_CHOICES,
  attribution: ["free", "shades"],
  language: ["en", "nl"],
  categories: [],
  view: ["player", "host", "both"],
  role: ["artist", "bamboozler"],
  players: [3, 4, 5, 6],
};

const keys = Object.keys(defaults) as (keyof LabSettings)[];
const numeric = new Set<keyof LabSettings>(["players", "turnsPerPlayer", "turnSeconds", "rounds"]);

function pick<K extends keyof LabSettings>(key: K, raw: unknown): LabSettings[K] | undefined {
  if (key === "categories") {
    const names = typeof raw === "string" ? raw.split(",") : Array.isArray(raw) ? raw : [];
    const clean = names.filter((name): name is string => typeof name === "string" && name.trim() !== "");
    return (clean.length > 0 ? clean : undefined) as LabSettings[K] | undefined;
  }
  let value = raw;
  if (typeof raw === "string" && numeric.has(key)) value = Number(raw);
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
    const value = settings[key];
    const isDefault = Array.isArray(value) ? value.length === 0 : value === defaults[key];
    if (isDefault) params.delete(key);
    else params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const LabSettingsUtils = { defaults, choices, read, toSearch };
