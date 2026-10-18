import { useEffect, useId, useRef, type FormEvent, type Ref } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { LobbyCategoryPicker } from "@/components/lobby/LobbyCategoryPicker.component";
import { LobbyFooter } from "@/components/lobby/LobbyFooter.component";
import { LobbySetupUtils } from "@/components/lobby/_utils/lobbySetup.utils";
import type { Attribution } from "@/components/room/_types/room.types";
import type { Language } from "@/protocol/generated/Language";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
import type { TurnMode } from "@/protocol/generated/TurnMode";
import type { WordCategory } from "@/protocol/generated/WordCategory";

type LobbySetupProps = {
  roomCode: string;
  settings: RoomSettings;
  /** Every category the server has, in every language. */
  wordCategories: WordCategory[];
  onChange: (settings: RoomSettings) => void;
  onDone: () => void;
  /** Any colour or Own colours: only where it can be tried (the lab), until the server has the setting. */
  attribution?: Attribution;
  onAttribution?: (attribution: Attribution) => void;
};

type Option<T> = { value: T; title: string; detail: string };

const turnOptions: Option<TurnMode>[] = [
  { value: "oneStroke", title: "One stroke each", detail: "Draw one line, pass it on" },
  { value: "timed", title: "Timed turns", detail: "A few seconds to draw freely" },
];
const colourOptions: Option<Attribution>[] = [
  { value: "free", title: "Any colour", detail: "Everyone uses every colour" },
  { value: "shades", title: "Own colours", detail: "Each player gets a family of shades" },
];

/** The host's room setup: turns, rounds, words. Every change goes to the room straight away. */
export function LobbySetup({
  roomCode,
  settings,
  wordCategories,
  onChange,
  onDone,
  attribution,
  onAttribution,
}: LobbySetupProps) {
  const first = useRef<HTMLInputElement>(null);
  const wordsHeading = useId();
  const change = (patch: Partial<RoomSettings>) => onChange({ ...settings, ...patch });
  const ready = settings.categories.length > 0;

  useEffect(() => first.current?.focus(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) onDone();
  };

  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-3 md:max-w-5xl">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrandLogo className="size-10" />
            <p className="font-display text-2xl">BamDoodle</p>
          </div>
          <p className="rounded-full bg-night-soft px-3 py-1 text-sm text-white/80">
            <span className="sr-only">Room code </span>
            <span aria-hidden="true">Room </span>
            <span className="font-display tracking-widest">{roomCode}</span>
          </p>
        </header>

        <div className="flex flex-1 flex-col justify-center">
          <form
            onSubmit={submit}
            className="relative grid w-full gap-5 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:gap-x-8 md:gap-y-4"
          >
            <BrandSketchyFrame className="text-white/25" />
            <h2 className="font-display text-2xl md:col-span-2">Set up your room</h2>
            <div className="grid content-start gap-5 md:gap-4">
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
                name="lobby-rounds"
                options={LobbySetupUtils.choices.rounds.map((rounds) => ({ value: rounds, label: String(rounds) }))}
                value={settings.rounds}
                onChange={(rounds) => change({ rounds })}
              />
              {attribution && onAttribution && (
                <LobbyChoice
                  legend="Colours"
                  name="lobby-colours"
                  options={colourOptions}
                  value={attribution}
                  onChange={onAttribution}
                />
              )}
            </div>

            <section
              aria-labelledby={wordsHeading}
              className="grid content-start gap-5 border-t-2 md:gap-4 border-white/10 pt-5 md:border-t-0 md:border-l-2 md:pt-0 md:pl-8"
            >
              <h3 id={wordsHeading} className="font-display text-xl">
                Words
              </h3>
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

            <button
              type="submit"
              disabled={!ready}
              className={`${BrandStyles.primaryButton} sticky bottom-3 z-10 justify-self-end shadow-[0_6px_18px_var(--color-night-deep)] md:col-span-2`}
            >
              Go to the room
            </button>
          </form>
        </div>
      </main>
      <LobbyFooter />
    </div>
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
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm text-white/70">{legend}</legend>
      <div className={`grid gap-2 ${options.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-[12px_16px_14px_10px] bg-night-deep p-3 ring-2 ring-transparent has-checked:ring-sun has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <input
              ref={value === option.value ? firstRef : undefined}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-label={option.title}
              aria-describedby={`${name}-${option.value}-detail`}
              className="sr-only"
            />
            <span className="block font-display text-lg leading-tight">{option.title}</span>
            <span id={`${name}-${option.value}-detail`} className="mt-0.5 block text-sm text-white/70">
              {option.detail}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function LobbyPills<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm text-white/70">{legend}</legend>
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
    </fieldset>
  );
}
