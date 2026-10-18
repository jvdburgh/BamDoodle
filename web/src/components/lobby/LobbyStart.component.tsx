import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BrandFooter } from "@/components/brand/BrandFooter.component";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandTagline } from "@/components/brand/BrandTagline.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";

export type LobbyEntry = { name: string } & ({ kind: "create" } | { kind: "join"; code: string });

type LobbyStartProps = {
  onEnter: (entry: LobbyEntry) => void;
  /** Creating starts with setting the room up; your name comes after (the `create` step). */
  onCreate: () => void;
  /** Back from the step you opened on, e.g. from your name to the room setup. Without it: back to the choice. */
  onBack?: () => void;
  defaultName?: string;
  /** From a shared link: opens straight on joining this room. */
  defaultCode?: string;
  /** Open on this step instead of the choice, e.g. to try again. */
  step?: "join" | "create";
  /** Why the last try didn't get you in. */
  problem?: string;
  /** While the server is being asked: the button waits (Create a room, on the choice). */
  busy?: boolean;
  /** Back from creating a room, or it couldn't start: focus Create a room. */
  focusCreate?: boolean;
};

type Step = "choose" | "join" | "create";

/** Same as the server: `NAME_MAX_CHARS` in limits.rs, the code alphabet and length in registry.rs. */
const NAME_MAX = 20;
const CODE_LENGTH = 4;
const NOT_IN_CODE = /[^BCDFGHJKLMNPQRSTVWXZ]/g;

const field =
  "w-full rounded-[10px_14px_12px_9px] bg-night-deep px-4 py-3 text-lg text-white placeholder:text-white/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun";

/** The first page: join a room (most people) or create one. Creating sets the room up first, then asks your name. */
export function LobbyStart({
  onEnter,
  onCreate,
  onBack,
  defaultName = "",
  defaultCode = "",
  step: firstStep,
  problem,
  busy = false,
  focusCreate = false,
}: LobbyStartProps) {
  const [step, setStep] = useState<Step>(firstStep ?? (defaultCode ? "join" : "choose"));
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState(defaultCode);
  const nameId = useId();
  const codeId = useId();
  const firstField = useRef<HTMLElement | null>(null);
  const opened = useRef(false);
  const joinButton = useRef<HTMLButtonElement>(null);
  const createButton = useRef<HTMLButtonElement>(null);

  // Each step replaces the button you pressed: focus the step's first control, or on Back the button that opened it.
  useEffect(() => {
    if (step !== "choose") firstField.current?.focus();
    else if (opened.current) joinButton.current?.focus();
  }, [step]);

  // Once it's enabled again: a disabled button can't hold the focus.
  useEffect(() => {
    if (focusCreate && !busy) createButton.current?.focus();
  }, [focusCreate, busy]);

  const go = (next: Step) => {
    if (next !== "choose") opened.current = true;
    setStep(next);
  };
  const first = (element: HTMLElement | null) => {
    if (element) firstField.current = element;
  };

  const cleanName = name.trim();
  const canSubmit = !busy && cleanName.length > 0 && (step !== "join" || code.length === CODE_LENGTH);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (step === "join") onEnter({ kind: "join", name: cleanName, code });
    else onEnter({ kind: "create", name: cleanName });
  };

  const nameField = (
    <div className="grid gap-1.5">
      <label htmlFor={nameId} className="text-sm text-white/70">
        Your name
      </label>
      <input
        ref={step === "create" || (step === "join" && defaultCode) ? first : undefined}
        id={nameId}
        value={name}
        onChange={(event) => setName(event.target.value.slice(0, NAME_MAX))}
        autoComplete="nickname"
        className={field}
      />
    </div>
  );

  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-5 py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandLogo className="size-28 hover:animate-wiggle motion-reduce:hover:animate-none" />
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
              onClick={onCreate}
              disabled={busy}
              className={`${BrandStyles.quietButton} w-full`}
            >
              {busy ? "Just a sec…" : "Create a room"}
            </button>
            {problem && (
              <p role="alert" className="text-center text-sm text-berry">
                {problem}
              </p>
            )}
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="relative grid w-full gap-5 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-5"
          >
            <BrandSketchyFrame className="text-white/25" />
            <h3 className="font-display text-2xl">{step === "join" ? "Join a room" : "And you are?"}</h3>

            {step === "join" && (
              <>
                <div className="grid gap-1.5">
                  <label htmlFor={codeId} className="text-sm text-white/70">
                    Room code
                  </label>
                  <input
                    ref={defaultCode ? undefined : first}
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

            {step === "create" && nameField}

            {problem && (
              <p role="alert" className="text-sm text-berry">
                {problem}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={onBack ?? (() => go("choose"))} className={BrandStyles.ghostButton}>
                Back
              </button>
              <button type="submit" disabled={!canSubmit} className={BrandStyles.primaryButton}>
                {busy ? "Just a sec…" : step === "join" ? "Join" : "Create room"}
              </button>
            </div>
          </form>
        )}
      </main>
      <BrandFooter />
    </div>
  );
}
