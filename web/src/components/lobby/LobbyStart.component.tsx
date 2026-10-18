import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandTagline } from "@/components/brand/BrandTagline.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { LobbyCategoryPicker } from "@/components/lobby/LobbyCategoryPicker.component";
import type { Attribution, RoomSetup, TurnMode, WordCategory, WordLanguage } from "@/components/room/_types/room.types";
import { WordsUtils } from "@/components/room/_utils/words.utils";
import { RoundUtils } from "@/components/room/_utils/round.utils";

export type LobbyEntry = { name: string } & (({ kind: "create" } & RoomSetup) | { kind: "join"; code: string });

type LobbyStartProps = {
  onEnter: (entry: LobbyEntry) => void;
  defaultName?: string;
  /** Every word category, in every language. */
  wordCategories: WordCategory[];
};

type Step = "choose" | "join" | "setup" | "name";

/** Same as the server: `NAME_MAX_CHARS` in limits.rs, the code alphabet and length in registry.rs. */
const NAME_MAX = 20;
const CODE_LENGTH = 4;
const NOT_IN_CODE = /[^BCDFGHJKLMNPQRSTVWXZ]/g;

const field =
  "w-full rounded-[10px_14px_12px_9px] bg-night-deep px-4 py-3 text-lg text-white placeholder:text-white/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun";

type Option<T> = { value: T; title: string; detail: string };

const turnOptions: Option<TurnMode>[] = [
  { value: "oneStroke", title: "One stroke each", detail: "Draw one line, pass it on" },
  { value: "timed", title: "Timed turns", detail: "A few seconds to draw freely" },
];
const colourOptions: Option<Attribution>[] = [
  { value: "free", title: "Any colour", detail: "Everyone uses every colour" },
  { value: "shades", title: "Own colours", detail: "Each player gets a family of shades" },
];

/** The first page: join a room (most people) or create one. Creating sets the room up first, then asks your name. */

export function LobbyStart({ onEnter, defaultName = "", wordCategories }: LobbyStartProps) {
  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<RoomSetup>(() => ({
    ...RoundUtils.DEFAULT_SETUP,
    categories: WordsUtils.defaults(wordCategories, RoundUtils.DEFAULT_SETUP.language),
  }));
  const change = (patch: Partial<RoomSetup>) => setSetup((current) => ({ ...current, ...patch }));
  const nameId = useId();
  const codeId = useId();
  const firstField = useRef<HTMLElement | null>(null);
  const opener = useRef<"join" | "setup" | null>(null);
  const joinButton = useRef<HTMLButtonElement>(null);
  const createButton = useRef<HTMLButtonElement>(null);

  // Each step replaces the button you pressed: focus the step's first control, or on Back the button that opened it.
  useEffect(() => {
    if (step !== "choose") firstField.current?.focus();
    else if (opener.current) (opener.current === "join" ? joinButton : createButton).current?.focus();
  }, [step]);

  const go = (next: Step) => {
    if (next === "join" || next === "setup") opener.current = next;
    setStep(next);
  };
  const first = (element: HTMLElement | null) => {
    if (element) firstField.current = element;
  };

  const cleanName = name.trim();
  const canSubmit =
    step === "setup"
      ? setup.categories.length > 0
      : cleanName.length > 0 && (step !== "join" || code.length === CODE_LENGTH);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (step === "setup") go("name");
    else if (step === "join") onEnter({ kind: "join", name: cleanName, code });
    else onEnter({ kind: "create", name: cleanName, ...setup });
  };

  const nameField = (
    <div className="grid gap-1.5">
      <label htmlFor={nameId} className="text-sm text-white/70">
        Your name
      </label>
      <input
        ref={step === "name" ? first : undefined}
        id={nameId}
        value={name}
        onChange={(event) => setName(event.target.value.slice(0, NAME_MAX))}
        autoComplete="nickname"
        className={field}
      />
    </div>
  );

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-8 px-5 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <BrandLogo className="size-28" />
        <h2 className="font-display text-5xl">BamDoodle</h2>
        <BrandTagline />
      </div>

      {step === "choose" ? (
        <div className="grid w-full gap-3">
          <button
            ref={joinButton}
            type="button"
            onClick={() => go("join")}
            className={`${BrandStyles.primaryButton} w-full`}
          >
            Join a room
          </button>
          <button
            ref={createButton}
            type="button"
            onClick={() => go("setup")}
            className={`${BrandStyles.quietButton} w-full`}
          >
            Create a room
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="relative grid w-full gap-5 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-5"
        >
          <BrandSketchyFrame className="text-white/25" />
          <h3 className="font-display text-2xl">
            {step === "join" ? "Join a room" : step === "setup" ? "Set up your room" : "And you are?"}
          </h3>

          {step === "join" && (
            <>
              <div className="grid gap-1.5">
                <label htmlFor={codeId} className="text-sm text-white/70">
                  Room code
                </label>
                <input
                  ref={first}
                  id={codeId}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase().replace(NOT_IN_CODE, "").slice(0, CODE_LENGTH))
                  }
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="BKZW"
                  className={`${field} font-display text-3xl tracking-[0.3em] uppercase`}
                />
              </div>
              {nameField}
            </>
          )}

          {step === "setup" && (
            <>
              <LobbyChoice
                legend="Turns"
                name="lobby-mode"
                options={turnOptions}
                value={setup.mode}
                onChange={(mode) => change({ mode })}
                firstRef={first}
              />
              {setup.mode === "oneStroke" ? (
                <LobbyPills
                  legend="Each player draws"
                  name="lobby-turns"
                  options={RoundUtils.TURNS_PER_PLAYER_CHOICES.map((turns) => ({
                    value: turns,
                    label: turns === 1 ? "once" : `${turns} times`,
                  }))}
                  value={setup.turnsPerPlayer}
                  onChange={(turnsPerPlayer) => change({ turnsPerPlayer })}
                />
              ) : (
                <LobbyPills
                  legend="Seconds per turn"
                  name="lobby-seconds"
                  options={RoundUtils.TURN_SECOND_CHOICES.map((seconds) => ({ value: seconds, label: `${seconds} s` }))}
                  value={setup.turnSeconds}
                  onChange={(turnSeconds) => change({ turnSeconds })}
                />
              )}
              <LobbyPills
                legend="Rounds"
                name="lobby-rounds"
                options={RoundUtils.ROUND_CHOICES.map((rounds) => ({ value: rounds, label: String(rounds) }))}
                value={setup.rounds}
                onChange={(rounds) => change({ rounds })}
              />
              <LobbyChoice
                legend="Colours"
                name="lobby-colours"
                options={colourOptions}
                value={setup.attribution}
                onChange={(attribution) => change({ attribution })}
              />
              <LobbyPills<WordLanguage>
                legend="Words"
                name="lobby-language"
                options={[
                  { value: "en", label: "English" },
                  { value: "nl", label: "Nederlands" },
                ]}
                value={setup.language}
                onChange={(language) => change({ language, categories: WordsUtils.defaults(wordCategories, language) })}
              />
              <LobbyCategoryPicker
                categories={WordsUtils.inLanguage(wordCategories, setup.language)}
                selected={setup.categories}
                onChange={(categories) => change({ categories })}
              />
            </>
          )}

          {step === "name" && nameField}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => go(step === "name" ? "setup" : "choose")}
              className={BrandStyles.ghostButton}
            >
              Back
            </button>
            <button type="submit" disabled={!canSubmit} className={BrandStyles.primaryButton}>
              {step === "join" ? "Join" : step === "setup" ? "Next" : "Create room"}
            </button>
          </div>
        </form>
      )}
    </main>
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
  firstRef?: (element: HTMLInputElement | null) => void;
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
              className="sr-only"
            />
            <span className="block font-display text-lg leading-tight">{option.title}</span>
            <span className="mt-0.5 block text-sm text-white/70">{option.detail}</span>
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
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
