import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import { BrandFooter } from "@/components/brand/BrandFooter.component";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { LobbyCategoryPicker } from "@/components/lobby/LobbyCategoryPicker.component";
import { LobbySetupSketch, type LobbySetupSketchKind } from "@/components/lobby/LobbySetupSketch.component";
import { LobbySetupUtils } from "@/components/lobby/_utils/lobbySetup.utils";
import { SoundToggle } from "@/components/sound/SoundToggle.component";
import type { Language } from "@/protocol/generated/Language";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
import type { TurnMode } from "@/protocol/generated/TurnMode";
import type { WordCategory } from "@/protocol/generated/WordCategory";

type LobbySetupProps = {
  /** None yet when the room is set up before it's created. */
  roomCode?: string;
  settings: RoomSettings;
  /** Every category the server has, in every language. */
  wordCategories: WordCategory[];
  onChange: (settings: RoomSettings) => void;
  onDone: () => void;
  /** What the done button says: going to the room, or on to your name when the room doesn't exist yet. */
  doneLabel?: string;
  onBack?: () => void;
  /** Where the logo goes: the start page. */
  home?: string;
};

type Option<T> = { value: T; title: string; detail: string; sketch: LobbySetupSketchKind };

const turnOptions: Option<TurnMode>[] = [
  { value: "timed", title: "Timed turns", detail: "A few seconds to draw freely", sketch: { kind: "timed" } },
  { value: "oneStroke", title: "One stroke each", detail: "Draw one line, pass it on", sketch: { kind: "oneStroke" } },
];

/** The host's room setup: turns, rounds, words. First before the room is created, later from the room itself. */
export function LobbySetup({
  roomCode,
  settings,
  wordCategories,
  onChange,
  onDone,
  doneLabel = "Go to the room",
  onBack,
  home = "/",
}: LobbySetupProps) {
  const first = useRef<HTMLInputElement>(null);
  const change = (patch: Partial<RoomSettings>) => onChange({ ...settings, ...patch });
  const ready = settings.categories.length > 0;

  useEffect(() => first.current?.focus(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) onDone();
  };

  return (
    <div className="flex min-h-svh flex-col pb-16 md:pb-0">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-3 md:max-w-5xl md:gap-6 md:py-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo named href={home} className="size-10" />
          <div className="flex items-center gap-1.5">
            {roomCode && (
              <p className="rounded-full bg-night-soft px-3 py-1 text-sm text-white/80">
                <span className="sr-only">Room code </span>
                <span aria-hidden="true">Room </span>
                <span className="font-display tracking-widest">{roomCode}</span>
              </p>
            )}
            <SoundToggle channel="music" />
            <SoundToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center">
          <form
            onSubmit={submit}
            className="relative grid w-full gap-5 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.25fr)] md:gap-x-10 md:gap-y-5 md:p-6"
          >
            <BrandSketchyFrame className="text-white/25" />
            <h2 className="font-display text-2xl md:col-span-2">Set up your room</h2>
            <div className="grid content-start gap-7">
              <LobbyChoice
                legend="Turns"
                hint="Everyone takes turns adding to the same drawing."
                name="lobby-mode"
                options={turnOptions}
                value={settings.mode}
                onChange={(mode) => change({ mode })}
                firstRef={first}
              />
              {settings.mode === "oneStroke" ? (
                <LobbyPills
                  legend="Lines per player"
                  hint="How many times everyone draws in a round."
                  sketch={{ kind: "turns", count: settings.turnsPerPlayer }}
                  name="lobby-turns"
                  options={LobbySetupUtils.choices.turnsPerPlayer.map((turns) => ({
                    value: turns,
                    label: turns === 1 ? "once" : `${turns} times`,
                  }))}
                  value={settings.turnsPerPlayer}
                  onChange={(turnsPerPlayer) => change({ turnsPerPlayer })}
                />
              ) : (
                <LobbyPills
                  legend="Time per turn"
                  hint={`Everyone gets ${LobbySetupUtils.timedTurnsPerPlayer} turns in a round.`}
                  sketch={{ kind: "seconds", seconds: settings.turnSeconds }}
                  name="lobby-seconds"
                  options={LobbySetupUtils.choices.turnSeconds.map((seconds) => ({
                    value: seconds,
                    label: `${seconds} s`,
                  }))}
                  value={settings.turnSeconds}
                  onChange={(turnSeconds) => change({ turnSeconds })}
                />
              )}
              <LobbyPills
                legend="Rounds"
                hint="Every round has a new secret word and a new bamboozler."
                sketch={{ kind: "rounds", count: settings.rounds }}
                name="lobby-rounds"
                options={LobbySetupUtils.choices.rounds.map((rounds) => ({ value: rounds, label: String(rounds) }))}
                value={settings.rounds}
                onChange={(rounds) => change({ rounds })}
              />
            </div>

            <div className="grid content-start gap-7 border-t-2 border-white/10 pt-6 md:border-t-0 md:border-l-2 md:pt-0 md:pl-10">
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

            <div className="sticky bottom-[calc(0.75rem_+_var(--browser-bar))] z-10 flex items-center justify-end gap-3 md:col-span-2 md:bottom-3">
              {onBack && (
                <button type="button" onClick={onBack} className={`${BrandStyles.quietButton} mr-auto`}>
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={!ready}
                className={`${BrandStyles.primaryButton} shadow-[0_6px_18px_var(--color-night-deep)]`}
              >
                {doneLabel}
              </button>
            </div>
          </form>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}

/** A setting: its name as a heading, a line on what it does, and a sketch of what's picked beside them. */
function LobbyField({
  legend,
  hint,
  sketch,
  children,
}: {
  legend: string;
  hint: string;
  sketch?: LobbySetupSketchKind;
  children: ReactNode;
}) {
  const hintId = useId();
  return (
    <fieldset aria-describedby={hintId} className="relative">
      <legend className="pr-14 font-display text-xl">{legend}</legend>
      <p id={hintId} className="mb-3 pr-14 text-sm text-white/70">
        {hint}
      </p>
      {sketch && <LobbySetupSketch sketch={sketch} className="absolute top-0 right-0 h-9 w-12" />}
      {children}
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
      <div className="grid gap-2 sm:grid-cols-2">
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
  hint,
  sketch,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint: string;
  sketch?: LobbySetupSketchKind;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [touched, setTouched] = useState(false);
  return (
    <LobbyField legend={legend} hint={hint} sketch={sketch}>
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
