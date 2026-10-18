import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandTagline } from "@/components/brand/BrandTagline.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import type { TurnMode } from "@/components/room/_types/room.types";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";

export type LobbyEntry = { name: string } & ({ kind: "create"; mode: TurnMode } | { kind: "join"; code: string });

type LobbyStartProps = {
  onEnter: (entry: LobbyEntry) => void;
  defaultName?: string;
};

/** Same as the server: `NAME_MAX_CHARS` in limits.rs, the code alphabet and length in registry.rs. */
const NAME_MAX = 20;
const CODE_LENGTH = 4;
const NOT_IN_CODE = /[^BCDFGHJKLMNPQRSTVWXZ]/g;

const field =
  "w-full rounded-[10px_14px_12px_9px] bg-night-deep px-4 py-3 text-lg text-white placeholder:text-white/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun";

/** The first page: create a room or join one. As few fields as possible. */
export function LobbyStart({ onEnter, defaultName = "" }: LobbyStartProps) {
  const [step, setStep] = useState<"choose" | "create" | "join">("choose");
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<TurnMode>("classic");
  const nameId = useId();
  const codeId = useId();
  const firstField = useRef<HTMLInputElement>(null);
  const opener = useRef<"create" | "join" | null>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const joinButton = useRef<HTMLButtonElement>(null);

  // The button you pressed disappears with each step: focus the first field, or on Back the button that opened it.
  useEffect(() => {
    if (step !== "choose") firstField.current?.focus();
    else if (opener.current) (opener.current === "join" ? joinButton : createButton).current?.focus();
  }, [step]);

  const open = (next: "create" | "join") => {
    opener.current = next;
    setStep(next);
  };

  const cleanName = name.trim();
  const canEnter = cleanName.length > 0 && (step !== "join" || code.length === CODE_LENGTH);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canEnter) return;
    onEnter(step === "join" ? { kind: "join", name: cleanName, code } : { kind: "create", name: cleanName, mode });
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <BrandLogo className="size-28" />
        <h2 className="font-display text-5xl">BamDoodle</h2>
        <BrandTagline />
      </div>

      {step === "choose" ? (
        <div className="grid w-full gap-3">
          <button
            type="button"
            ref={createButton}
            onClick={() => open("create")}
            className={`${BrandStyles.primaryButton} w-full`}
          >
            Create a room
          </button>
          <button
            type="button"
            ref={joinButton}
            onClick={() => open("join")}
            className={`${BrandStyles.quietButton} w-full`}
          >
            Join a room
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="relative grid w-full gap-4 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-5"
        >
          <BrandSketchyFrame className="text-white/25" />
          <h3 className="font-display text-2xl">{step === "join" ? "Join a room" : "New room"}</h3>

          {step === "join" && (
            <div className="grid gap-1.5">
              <label htmlFor={codeId} className="text-sm text-white/70">
                Room code
              </label>
              <input
                ref={firstField}
                id={codeId}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase().replace(NOT_IN_CODE, "").slice(0, CODE_LENGTH))
                }
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                placeholder="ABCD"
                className={`${field} font-display text-3xl tracking-[0.3em] uppercase`}
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <label htmlFor={nameId} className="text-sm text-white/70">
              Your name
            </label>
            <input
              ref={step === "create" ? firstField : undefined}
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, NAME_MAX))}
              autoComplete="nickname"
              className={field}
            />
          </div>

          {step === "create" && (
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-sm text-white/70">Turns</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["classic", "Classic", "One stroke each"],
                    ["timed", "Timed", "10 seconds each"],
                  ] as const
                ).map(([value, title, detail]) => (
                  <label
                    key={value}
                    className="cursor-pointer rounded-[12px_16px_14px_10px] bg-night-deep p-3 ring-2 ring-transparent has-checked:ring-sun has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
                  >
                    <input
                      type="radio"
                      name="lobby-mode"
                      value={value}
                      checked={mode === value}
                      onChange={() => setMode(value)}
                      className="sr-only"
                    />
                    <span className="block font-display text-lg">{title}</span>
                    <span className="block text-sm text-white/70">{detail}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="rounded-full px-3 py-2 text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!canEnter}
              className={`${BrandStyles.primaryButton} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {step === "join" ? "Join" : "Create room"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
