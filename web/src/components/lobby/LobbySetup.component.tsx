import { useEffect, useId, useRef, type FormEvent, type ReactNode, type Ref } from "react";
import { BrandFooter } from "@/components/brand/BrandFooter.component";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { LobbyCategoryPicker } from "@/components/lobby/LobbyCategoryPicker.component";
import { LobbySetupSketch, type LobbySetupSketchKind } from "@/components/lobby/LobbySetupSketch.component";
import { LobbySetupUtils } from "@/components/lobby/_utils/lobbySetup.utils";
import type { Attribution } from "@/components/room/_types/room.types";
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
  /** Any colour or Own colours: only where it can be tried (the lab), until the server has the setting. */
  attribution?: Attribution;
  onAttribution?: (attribution: Attribution) => void;
};

type Option<T> = { value: T; title: string; detail: string; sketch: LobbySetupSketchKind };

const turnOptions: Option<TurnMode>[] = [
  { value: "oneStroke", title: "One stroke each", detail: "Draw one line, pass it on", sketch: { kind: "oneStroke" } },
  { value: "timed", title: "Timed turns", detail: "A few seconds to draw freely", sketch: { kind: "timed" } },
];
const colourOptions: Option<Attribution>[] = [
  { value: "free", title: "Any colour", detail: "Everyone uses every colour", sketch: { kind: "anyColour" } },
  {
    value: "shades",
    title: "Own colours",
    detail: "Each player gets a family of shades",
    sketch: { kind: "ownColours" },
  },
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
  attribution,
  onAttribution,
}: LobbySetupProps) {
  const first = useRef<HTMLInputElement>(null);
  const wordsHeading = useId();
  const roundHeading = useId();
  const gameHeading = useId();
  const change = (patch: Partial<RoomSettings>) => onChange({ ...settings, ...patch });
  const ready = settings.categories.length > 0;

  useEffect(() => first.current?.focus(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) onDone();
  };

  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-3 md:max-w-5xl md:gap-6 md:py-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo named href={home} className="size-10" />
          {roomCode && (
            <p className="rounded-full bg-night-soft px-3 py-1 text-sm text-white/80">
              <span className="sr-only">Room code </span>
              <span aria-hidden="true">Room </span>
              <span className="font-display tracking-widest">{roomCode}</span>
            </p>
          )}
        </header>

        <div className="flex flex-1 flex-col justify-center">
          <form
            onSubmit={submit}
            className="relative grid w-full gap-5 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.25fr)] md:gap-x-10 md:gap-y-5 md:p-6"
          >
            <BrandSketchyFrame className="text-white/25" />
            <h2 className="font-display text-2xl md:col-span-2">Set up your room</h2>
            <div className="grid content-start gap-6">
              <section aria-labelledby={roundHeading} className="grid content-start gap-5">
                <h3 id={roundHeading} className="font-display text-xl">
                  Each round
                </h3>
                <LobbyChoice
                  legend="Turns"
                  name="lobby-mode"
                  options={turnOptions}
                  value={settings.mode}
                  onChange={(mode) => change({ mode })}
                  firstRef={first}
                />
                {settings.mode === "oneStroke" ? (
                  <LobbyPills
                    legend="Each player draws"
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
                    legend="Seconds per turn"
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
                {attribution && onAttribution && (
                  <LobbyChoice
                    legend="Colours"
                    name="lobby-colours"
                    options={colourOptions}
                    value={attribution}
                    onChange={onAttribution}
                  />
                )}
              </section>
              <section
                aria-labelledby={gameHeading}
                className="grid content-start gap-5 border-t-2 border-white/10 pt-6"
              >
                <h3 id={gameHeading} className="font-display text-xl">
                  The game
                </h3>
                <LobbyPills
                  legend="Rounds per game"
                  sketch={{ kind: "rounds", count: settings.rounds }}
                  name="lobby-rounds"
                  options={LobbySetupUtils.choices.rounds.map((rounds) => ({ value: rounds, label: String(rounds) }))}
                  value={settings.rounds}
                  onChange={(rounds) => change({ rounds })}
                />
              </section>
            </div>

            <section
              aria-labelledby={wordsHeading}
              className="grid content-start gap-5 border-t-2 border-white/10 pt-6 md:border-t-0 md:border-l-2 md:pt-0 md:pl-10"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 id={wordsHeading} className="font-display text-xl">
                  Words
                </h3>
                <LobbySetupSketch sketch={{ kind: "words" }} className="h-9 w-12 shrink-0" />
              </div>
              <LobbyPills<Language>
                legend="Language"
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
            </section>

            <div className="sticky bottom-3 z-10 flex items-center justify-end gap-3 md:col-span-2">
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

/** A labelled group of choices, with an optional sketch beside its label. */
function LobbyField({
  legend,
  sketch,
  children,
}: {
  legend: string;
  sketch?: LobbySetupSketchKind;
  children: ReactNode;
}) {
  return (
    <fieldset className="relative">
      <legend className="mb-2 text-sm text-white/70">{legend}</legend>
      {sketch && <LobbySetupSketch sketch={sketch} className="absolute -top-2 right-0 h-8 w-11" />}
      {children}
    </fieldset>
  );
}

function LobbyChoice<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
  firstRef,
}: {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  firstRef?: Ref<HTMLInputElement>;
}) {
  const detailId = useId();
  return (
    <LobbyField legend={legend}>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="relative cursor-pointer rounded-[12px_16px_14px_10px] bg-night-deep p-3 ring-2 ring-transparent has-checked:ring-sun has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <input
              ref={value === option.value ? firstRef : undefined}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-label={option.title}
              aria-describedby={`${detailId}-${option.value}`}
              className="sr-only"
            />
            <LobbySetupSketch sketch={option.sketch} className="absolute top-2 right-2 h-7 w-10" />
            <span className="block pr-10 font-display text-lg leading-tight">{option.title}</span>
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
  sketch,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  sketch?: LobbySetupSketchKind;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <LobbyField legend={legend} sketch={sketch}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-full bg-night-deep px-4 font-display text-lg ring-2 ring-transparent has-checked:text-sun has-checked:ring-sun has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-label={option.label}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </LobbyField>
  );
}
