import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import { BrandFooter } from "@/components/brand/BrandFooter.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { LobbyCategoryPicker } from "@/components/lobby/LobbyCategoryPicker.component";
import { LobbyHeader } from "@/components/lobby/LobbyHeader.component";
import { LobbySetupSketch, type LobbySetupSketchKind } from "@/components/lobby/LobbySetupSketch.component";
import { LobbySetupUtils } from "@/components/lobby/_utils/lobbySetup.utils";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import type { Language } from "@/protocol/generated/Language";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
import type { TurnMode } from "@/protocol/generated/TurnMode";
import type { WordCategory } from "@/protocol/generated/WordCategory";

type LobbySetupProps = {
  /**
   * The room's settings, opened from the room between rounds: "Room settings", and every change reaches the room at
   * once. None while the room is set up before it's created.
   */
  roomCode?: string;
  settings: RoomSettings;
  /** Every category the server has, in every language. */
  wordCategories: WordCategory[];
  onChange: (settings: RoomSettings) => void;
  onDone: () => void;
  /** What the done button says: back to the room, or on to your name when the room doesn't exist yet. */
  doneLabel?: string;
  onBack?: () => void;
  /** Where the logo goes: the start page. */
  home?: string;
};

type Option<T> = { value: T; title: string; detail: string; sketch: LobbySetupSketchKind };

const turnOptions: Option<TurnMode>[] = [
  { value: "timed", title: "Timed turns", detail: "Draw freely until the timer runs out", sketch: { kind: "timed" } },
  { value: "oneStroke", title: "One stroke each", detail: "Draw one line, pass it on", sketch: { kind: "oneStroke" } },
];

const numbers = (values: number[]) => values.map((value) => ({ value, label: String(value) }));

/**
 * The host's room setup: turns, rounds, words. First before the room is created, later from the room itself. A round
 * is one word, one drawing, one bamboozler and one vote; a turn is one go with the pen.
 */
export function LobbySetup({
  roomCode,
  settings,
  wordCategories,
  onChange,
  onDone,
  doneLabel = "Back to the room",
  onBack,
  home = "/",
}: LobbySetupProps) {
  const first = useRef<HTMLInputElement>(null);
  const change = (patch: Partial<RoomSettings>) => onChange({ ...settings, ...patch });
  const ready = settings.categories.length > 0;
  const inRoom = roomCode !== undefined;

  useEffect(() => first.current?.focus(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) onDone();
  };

  return (
    <div className="flex min-h-svh flex-col pb-16 md:pb-0">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-3 md:max-w-5xl md:gap-6 md:py-8">
        <LobbyHeader roomCode={roomCode} home={home} />

        <form
          onSubmit={submit}
          className="relative grid w-full gap-5 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-x-12 md:gap-y-6 md:p-8"
        >
          <BrandSketchyFrame className="text-white/25" />
          <div className="md:col-span-2">
            <h2 className="font-display text-2xl md:text-3xl">{inRoom ? "Room settings" : "Set up your room"}</h2>
            <p className="text-white/70">
              {inRoom ? (
                "Changes reach everyone right away."
              ) : (
                <>
                  {/* A phone keeps to one line here; who it's for is in How to play. */}
                  <span className="max-md:hidden sideways:hidden">
                    For {RoomViewUtils.playerCount}, each on their own device.{" "}
                  </span>
                  You can change all of this between rounds.
                </>
              )}
            </p>
          </div>
          <div className="grid content-start gap-7 md:gap-8">
            <LobbyChoice
              legend="Mode"
              hint="How a turn works."
              name="lobby-mode"
              options={turnOptions}
              value={settings.mode}
              onChange={(mode) => change({ mode })}
              firstRef={first}
            />
            {settings.mode === "oneStroke" ? (
              <LobbyPills
                legend="Turns each"
                hint="Each turn is one line. How many turns everyone gets per word."
                sketch={{ kind: "turns", count: settings.turnsPerPlayer }}
                name="lobby-turns"
                options={numbers(LobbySetupUtils.choices.turnsPerPlayer)}
                value={settings.turnsPerPlayer}
                onChange={(turnsPerPlayer) => change({ turnsPerPlayer })}
              />
            ) : (
              <LobbyPills
                legend="Time per turn"
                unit="seconds"
                hint={`Everyone gets ${LobbySetupUtils.timedTurnsPerPlayer} turns per word.`}
                sketch={{ kind: "seconds", seconds: settings.turnSeconds }}
                name="lobby-seconds"
                options={numbers(LobbySetupUtils.choices.turnSeconds)}
                value={settings.turnSeconds}
                onChange={(turnSeconds) => change({ turnSeconds })}
              />
            )}
            <LobbyPills
              legend="Rounds"
              hint="One round is one word, one drawing and one vote, with a new bamboozler each time."
              note={LobbySetupUtils.estimate(settings)}
              sketch={{ kind: "rounds", count: settings.rounds }}
              name="lobby-rounds"
              options={numbers(LobbySetupUtils.choices.rounds)}
              value={settings.rounds}
              onChange={(rounds) => change({ rounds })}
            />
          </div>

          <div className="grid content-start gap-7 border-t-2 border-white/10 pt-6 md:gap-8 md:border-t-0 md:border-l-2 md:pt-0 md:pl-12">
            <LobbyPills<Language>
              legend="Language"
              hint="Of the secret words."
              sketch={{ kind: "words" }}
              name="lobby-language"
              options={[
                { value: "en", label: "English" },
                { value: "nl", label: "Nederlands" },
              ]}
              value={settings.language}
              onChange={(language) =>
                change({ language, categories: LobbySetupUtils.defaults(wordCategories, language) })
              }
            />
            <LobbyCategoryPicker
              categories={LobbySetupUtils.inLanguage(wordCategories, settings.language)}
              selected={settings.categories}
              onChange={(categories) => change({ categories })}
            />
          </div>

          {/* At the end of the form, where you get after the last setting: no bar floating over the categories. On a
              phone one full-width main button with Back under it, like the forms; the picks are right above it. */}
          <div className="flex flex-col gap-2 border-t-2 border-white/10 pt-5 md:col-span-2 md:flex-row md:items-center md:gap-3">
            <p className="text-sm text-white/70 max-md:hidden md:flex-1 sideways:hidden md:text-right">
              {RoomViewUtils.settingsLine(settings)}
            </p>
            <button type="submit" disabled={!ready} className={`${BrandStyles.primaryButton} w-full md:w-auto`}>
              {doneLabel}
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className={`${BrandStyles.ghostButton} self-center md:order-first md:self-auto`}
              >
                Back
              </button>
            )}
          </div>
        </form>
      </main>
      <BrandFooter />
    </div>
  );
}

/** A setting: its name as a heading, a line on what it does, and a sketch of what's picked beside them. */
function LobbyField({
  legend,
  unit,
  hint,
  note,
  sketch,
  children,
}: {
  legend: string;
  /** What the numbers count, after the heading. */
  unit?: string;
  hint: string;
  /** A line under the choices, e.g. how long that makes the game. */
  note?: string;
  sketch?: LobbySetupSketchKind;
  children: ReactNode;
}) {
  const hintId = useId();
  return (
    <fieldset aria-describedby={hintId} className="relative">
      <legend className="pr-14 font-display text-xl max-md:mb-3 sideways:mb-3">
        {legend}
        {unit && <span className="font-body text-base text-white/60"> ({unit})</span>}
      </legend>
      {/* On a phone the heading, the choices and the sketch say enough: the line is read out, not shown. */}
      <p id={hintId} className="mb-3 pr-14 text-sm text-white/70 max-md:sr-only sideways:sr-only">
        {hint}
      </p>
      {sketch && <LobbySetupSketch sketch={sketch} className="absolute top-0 right-0 h-9 w-12" />}
      {children}
      {note && <p className="mt-2 text-sm text-white/70">{note}</p>}
    </fieldset>
  );
}

function LobbyChoice<T extends string | number>({
  legend,
  hint,
  name,
  options,
  value,
  onChange,
  firstRef,
}: {
  legend: string;
  hint: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  firstRef?: Ref<HTMLInputElement>;
}) {
  const detailId = useId();
  const [touched, setTouched] = useState(false);
  return (
    <LobbyField legend={legend} hint={hint}>
      <div className="grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="group relative cursor-pointer rounded-[12px_16px_14px_10px] bg-night-deep p-3 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <BrandSketchyFrame whenChecked traceIn={touched} className="text-sun" />
            <input
              ref={value === option.value ? firstRef : undefined}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                setTouched(true);
                onChange(option.value);
              }}
              aria-label={option.title}
              aria-describedby={`${detailId}-${option.value}`}
              className="sr-only"
            />
            <LobbySetupSketch sketch={option.sketch} className="absolute top-2 right-2 h-7 w-10" />
            <span className="flex items-center gap-1.5 pr-10 font-display text-lg leading-tight">
              <LobbyPickedCheck />
              {option.title}
            </span>
            <span id={`${detailId}-${option.value}`} className="mt-0.5 block text-sm text-white/70">
              {option.detail}
            </span>
          </label>
        ))}
      </div>
    </LobbyField>
  );
}

function LobbyPills<T extends string | number>({
  legend,
  unit,
  hint,
  note,
  sketch,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  unit?: string;
  hint: string;
  note?: string;
  sketch?: LobbySetupSketchKind;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [touched, setTouched] = useState(false);
  return (
    <LobbyField legend={legend} unit={unit} hint={hint} note={note} sketch={sketch}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="group relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-night-deep px-4 font-display text-lg has-checked:text-sun has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <BrandSketchyFrame whenChecked traceIn={touched} className="text-sun" />
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                setTouched(true);
                onChange(option.value);
              }}
              aria-label={option.label}
              className="sr-only"
            />
            <LobbyPickedCheck />
            {option.label}
          </label>
        ))}
      </div>
    </LobbyField>
  );
}

/** The doodled ✓ on a picked choice. */
function LobbyPickedCheck() {
  return <BrandScribble shape="check" className="hidden size-4 shrink-0 text-sun group-has-checked:inline-block" />;
}
