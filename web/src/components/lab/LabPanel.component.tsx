import { useEffect, useId, useState } from "react";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { LabSettingsUtils, type LabSettings } from "@/components/lab/_utils/labSettings.utils";

type LabPanelProps = {
  settings: LabSettings;
  onChange: (patch: Partial<LabSettings>) => void;
  onReset: () => void;
  /** Start open, for stories. */
  defaultOpen?: boolean;
  /** The toggle hides on phone-sized screens (it's a testing tool and would cover buttons) unless this is set. */
  showOnPhones?: boolean;
};

/** Testing switches only; mode, colours and round length are chosen when creating a room. */
type LabKey = "screen" | "view" | "role" | "players";

type Choice<K extends LabKey> = { value: LabSettings[K]; label: string };

const labels: { [K in LabKey]: { legend: string; options: Choice<K>[] } } = {
  screen: {
    legend: "Screen",
    options: [
      { value: "start", label: "Start page" },
      { value: "lobby", label: "Lobby" },
      { value: "room", label: "Room" },
    ],
  },
  view: {
    legend: "View",
    options: [
      { value: "player", label: "Phone" },
      { value: "host", label: "Host screen" },
      { value: "both", label: "Both" },
    ],
  },
  role: {
    legend: "You are",
    options: [
      { value: "artist", label: "Artist" },
      { value: "bamboozler", label: "Bamboozler" },
    ],
  },
  players: {
    legend: "Players",
    options: LabSettingsUtils.choices.players.map((value) => ({ value, label: String(value) })),
  },
};

const order = Object.keys(labels) as LabKey[];

/** Switches for the playground, tucked in the bottom-right corner. Nothing here is part of the real game. */
export function LabPanel({ settings, onChange, onReset, defaultOpen = false, showOnPhones = false }: LabPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      className={`fixed right-3 bottom-3 z-50 flex-col-reverse items-end gap-2 ${showOnPhones ? "flex" : "hidden sm:flex"}`}
    >
      {/* The toggle comes first so Tab goes from it into the panel; flex-col-reverse shows it below. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="rounded-full bg-sun/90 px-3 py-1.5 font-display text-base leading-none text-night shadow-[0_2px_0_var(--color-amber)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {open ? "Close lab" : "Lab"}
      </button>
      {open && (
        <section
          id={panelId}
          aria-label="Lab"
          className="relative max-h-[min(36rem,calc(100svh-5rem))] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[16px_20px_18px_14px] bg-night-deep p-4 shadow-[0_6px_0_var(--color-night)]"
        >
          <BrandSketchyFrame className="text-white/30" />
          <p className="text-sm text-white/70">Prototype on this device only; nothing syncs yet.</p>
          <div className="mt-3 grid gap-3">
            {order.map((key) => (
              <LabChoice key={key} name={key} settings={settings} onChange={onChange} />
            ))}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="mt-4 rounded-full bg-night-soft px-4 py-1.5 text-sm hover:bg-iris/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
          >
            Reset everything
          </button>
        </section>
      )}
    </div>
  );
}

function LabChoice<K extends LabKey>({
  name,
  settings,
  onChange,
}: {
  name: K;
  settings: LabSettings;
  onChange: (patch: Partial<LabSettings>) => void;
}) {
  const { legend, options } = labels[name];
  return (
    <fieldset>
      <legend className="mb-1 text-xs text-white/60">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label
            key={String(option.value)}
            className="cursor-pointer rounded-full bg-night-soft px-3 py-1 text-sm text-white ring-2 ring-transparent has-checked:bg-night has-checked:text-sun has-checked:ring-sun has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <input
              type="radio"
              name={`lab-${name}`}
              value={String(option.value)}
              checked={settings[name] === option.value}
              onChange={() => onChange({ [name]: option.value } as Partial<LabSettings>)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
