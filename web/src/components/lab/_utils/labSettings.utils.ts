import type { CanvasSurface } from "@/components/canvas/CanvasBoard.component";
import type { Attribution, Seats, TurnMode } from "@/components/room/_types/room.types";
import type { Role } from "@/protocol/generated/Role";

export type LabFont = "love" | "grandstander" | "dynapuff" | "fredoka" | "gochi" | "patrick";
export type LabView = "player" | "host" | "both";

/** The playground's switches. Persisted per viewer; the non-default ones also go in the URL so a link reproduces them. */
export type LabSettings = {
  /** The create-or-join start page, or straight into the room. */
  screen: "start" | "room";
  font: LabFont;
  attribution: Attribution;
  mode: TurnMode;
  view: LabView;
  role: Role;
  seats: Seats;
  players: number;
  surface: CanvasSurface;
};

/** Display fonts to compare (docs/brand.md). Weight is what each looks best at for headings. */
const fonts: Record<LabFont, { name: string; family: string; weight: number }> = {
  love: { name: "Love Ya Like A Sister", family: '"Love Ya Like A Sister"', weight: 400 },
  grandstander: { name: "Grandstander", family: '"Grandstander Variable"', weight: 800 },
  dynapuff: { name: "DynaPuff", family: '"DynaPuff Variable"', weight: 600 },
  fredoka: { name: "Fredoka", family: '"Fredoka Variable"', weight: 600 },
  gochi: { name: "Gochi Hand", family: '"Gochi Hand"', weight: 400 },
  patrick: { name: "Patrick Hand", family: '"Patrick Hand"', weight: 400 },
};

const defaults: LabSettings = {
  screen: "start",
  font: "love",
  attribution: "free",
  mode: "classic",
  view: "player",
  role: "artist",
  seats: "simulated",
  players: 6,
  surface: "paper",
};

const choices: { [K in keyof LabSettings]: readonly LabSettings[K][] } = {
  screen: ["start", "room"],
  font: Object.keys(fonts) as LabFont[],
  attribution: ["free", "shades"],
  mode: ["classic", "timed"],
  view: ["player", "host", "both"],
  role: ["artist", "bamboozler"],
  seats: ["simulated", "shared"],
  players: [3, 4, 5, 6],
  surface: ["paper", "night"],
};

const keys = Object.keys(defaults) as (keyof LabSettings)[];

function pick<K extends keyof LabSettings>(key: K, raw: unknown): LabSettings[K] | undefined {
  const value = key === "players" && typeof raw === "string" ? Number(raw) : raw;
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

export const LabSettingsUtils = { fonts, defaults, choices, read, toSearch };
