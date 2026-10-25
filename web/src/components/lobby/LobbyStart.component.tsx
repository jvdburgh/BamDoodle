import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BrandFooter } from "@/components/brand/BrandFooter.component";
import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandSketchyFrame } from "@/components/brand/BrandSketchyFrame.component";
import { BrandTagline } from "@/components/brand/BrandTagline.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { LobbyHeader } from "@/components/lobby/LobbyHeader.component";
import { LobbyHowToPlay } from "@/components/lobby/LobbyHowToPlay.component";
import { SoundToggle } from "@/components/sound/SoundToggle.component";
import { RoomCodeUtils } from "@/protocol/roomCode.utils";

/** "create" plays in a new room; "host" makes one hosted on this screen, which doesn't play. */
export type LobbyEntry = { name: string } & ({ kind: "create" } | { kind: "host" } | { kind: "join"; code: string });

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
  /** Why the last try didn't get you in: shown until you go back or start something else. */
  problem?: string;
  /** While the server is being asked: the button waits (Create a room, on the choice). */
  busy?: boolean;
  /** Back from creating a room, or it couldn't start: focus Create a room. */
  focusCreate?: boolean;
};

type Step = "choose" | "join" | "create";

/** Same as the server: `NAME_MAX_CHARS` in limits.rs. */
const NAME_MAX = 20;

const field =
  "w-full rounded-[10px_14px_12px_9px] bg-night-deep px-4 py-3 text-lg text-white placeholder:text-white/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun";

/** On a laptop the play-or-host choices are two cards side by side; a phone on its side keeps them plain. */
const choiceCard =
  "md:relative md:content-between md:rounded-[14px_18px_16px_12px] md:bg-night-deep/50 md:p-5 sideways:bg-transparent! sideways:p-0!";

/**
 * The first page: join a room (most people) or create one, then how to play below. Creating sets the room up first,
 * then asks your name. The music and sound toggles are here already: the music plays from the first tap.
 */
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
  /** Moved on from the problem, by going back or starting something else; a new one shows again. */
  const [problemGone, setProblemGone] = useState(false);
  const [lastProblem, setLastProblem] = useState(problem);
  if (problem !== lastProblem) {
    setLastProblem(problem);
    setProblemGone(false);
  }
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
    setProblemGone(true);
    setStep(next);
  };
  const shownProblem = problemGone ? undefined : problem;
  const first = (element: HTMLElement | null) => {
    if (element) firstField.current = element;
  };

  const cleanName = name.trim();
  const canSubmit = !busy && cleanName.length > 0 && (step !== "join" || code.length === RoomCodeUtils.LENGTH);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (step === "join") onEnter({ kind: "join", name: cleanName, code });
    else onEnter({ kind: "create", name: cleanName });
  };

  const nameField = (
    <div className={`grid content-start gap-1.5 ${step === "create" ? "md:col-span-2 sideways:col-span-1!" : ""}`}>
      {/* After the setup the heading asks for it already. */}
      <label htmlFor={nameId} className={step === "create" ? "sr-only" : "text-sm text-white/70"}>
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

  const problemLine = shownProblem && (
    <p role="alert" className="col-span-full text-sm text-berry">
      {shownProblem}
    </p>
  );

  const backButton = (
    <button
      type="button"
      onClick={
        onBack
          ? () => {
              setProblemGone(true);
              onBack();
            }
          : () => go("choose")
      }
      className={`${BrandStyles.ghostButton} col-span-full justify-self-center`}
    >
      Back
    </button>
  );

  if (step === "choose") {
    return (
      <div className="flex min-h-svh flex-col pb-16 md:pb-0">
        <div className="flex justify-end gap-1.5 px-4 pt-3">
          <SoundToggle channel="music" />
          <SoundToggle />
        </div>
        <div className="flex flex-1 flex-col">
          {/* Two thirds of the screen, so how to play always peeks out below; on its side, the buttons beside the logo. */}
          <main className="mx-auto flex min-h-[66svh] w-full max-w-md flex-col items-center justify-center gap-8 px-5 pb-6 sideways:min-h-[calc(100svh-3.5rem)] sideways:max-w-3xl sideways:flex-row sideways:gap-12">
            <div className="flex flex-col items-center gap-2 text-center">
              <BrandLogo swirlOnHover className="size-28 sideways:size-20" />
              <h2 className="font-display text-5xl sideways:text-4xl">BamDoodle</h2>
              <BrandTagline />
            </div>

            <div className="grid w-full gap-5 sideways:flex-1 sideways:gap-4">
              <button
                ref={joinButton}
                type="button"
                onClick={() => go("join")}
                className={`${BrandStyles.primaryButton} group relative w-full gap-3`}
              >
                <BrandSketchyFrame rainbow />
                <BrandScribble shape="door" className="size-7 motion-safe:group-hover:animate-wiggle" />
                Join a room
              </button>
              <button
                ref={createButton}
                type="button"
                onClick={onCreate}
                disabled={busy}
                className={`${BrandStyles.quietButton} group relative w-full gap-3`}
              >
                <BrandSketchyFrame rainbow className="opacity-60 group-disabled:hidden" />
                <BrandScribble
                  shape="pencilPlus"
                  className="size-7 text-sun group-disabled:text-white/50 motion-safe:group-hover:animate-wiggle"
                />
                {busy ? "Just a sec…" : "Create a room"}
              </button>
              {shownProblem && (
                <p role="alert" className="text-center text-sm text-berry">
                  {shownProblem}
                </p>
              )}
            </div>
          </main>
          <LobbyHowToPlay />
        </div>
        <BrandFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col pb-16 md:pb-0">
      {/* The small logo on the forms: the fields and the button stay above a phone's keyboard. */}
      <div
        className={`mx-auto w-full px-4 pt-3 sideways:max-w-3xl ${step === "create" ? "max-w-md md:max-w-3xl" : "max-w-md"}`}
      >
        <LobbyHeader />
      </div>
      <main
        className={`mx-auto flex min-h-[calc(100svh-4.5rem)] w-full flex-col px-4 py-4 md:justify-center sideways:min-h-0 sideways:max-w-3xl sideways:py-3 ${step === "create" ? "max-w-md md:max-w-3xl" : "max-w-md"}`}
      >
        {step === "join" ? (
          <form
            onSubmit={submit}
            className="relative grid w-full gap-5 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-5 sm:p-6 sideways:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sideways:items-end sideways:gap-4 sideways:p-4"
          >
            <BrandSketchyFrame className="text-white/25" />
            <h2 className="col-span-full text-center font-display text-2xl">Join a room</h2>
            <div className="grid gap-1.5">
              <label htmlFor={codeId} className="text-sm text-white/70">
                Room code
              </label>
              <input
                ref={defaultCode ? undefined : first}
                id={codeId}
                value={code}
                onChange={(event) => setCode(RoomCodeUtils.clean(event.target.value))}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="e.g. ABCD"
                className={`${field} font-display text-3xl tracking-[0.3em] uppercase placeholder:text-2xl placeholder:tracking-normal placeholder:normal-case`}
              />
            </div>
            {nameField}
            <button type="submit" disabled={!canSubmit} className={`${BrandStyles.primaryButton} w-full`}>
              {busy ? "Just a sec…" : "Join"}
            </button>
            {problemLine}
            {backButton}
          </form>
        ) : (
          <form
            onSubmit={submit}
            className="relative grid w-full gap-5 rounded-[18px_24px_20px_16px] bg-night-soft/50 p-5 sm:p-6 md:grid-cols-2 sideways:grid-cols-2 sideways:gap-x-6 sideways:gap-y-4 sideways:p-4"
          >
            <BrandSketchyFrame className="text-white/25" />
            <h2 className="col-span-full text-center font-display text-2xl">What’s your name?</h2>
            {nameField}

            <div className={`grid gap-3 sideways:col-start-1 ${choiceCard}`}>
              <BrandSketchyFrame className="hidden text-white/15 md:block sideways:hidden!" />
              <p className="hidden text-sm text-white/70 md:block sideways:hidden!">
                Draw, suspect and vote along with everyone, each on their own device.
              </p>
              <button type="submit" disabled={!canSubmit} className={`${BrandStyles.primaryButton} w-full`}>
                {busy ? (
                  "Just a sec…"
                ) : (
                  <>
                    <span className="md:pointer-fine:hidden">Play on this phone</span>
                    <span className="hidden md:pointer-fine:inline">Play on this laptop</span>
                  </>
                )}
              </button>
            </div>

            <div
              className={`grid gap-3 text-center sideways:col-start-2 sideways:row-span-2 sideways:row-start-2 sideways:content-center md:text-left sideways:text-center! ${choiceCard}`}
            >
              <BrandSketchyFrame className="hidden text-white/15 md:block sideways:hidden!" />
              <p className="flex items-center gap-3 text-sm text-white/60 md:hidden sideways:flex!" aria-hidden="true">
                <span className="h-0.5 flex-1 rounded-full bg-white/10" />
                or
                <span className="h-0.5 flex-1 rounded-full bg-white/10" />
              </p>
              <button
                type="button"
                onClick={() => onEnter({ kind: "host", name: cleanName })}
                disabled={!canSubmit}
                className={`${BrandStyles.quietButton} group w-full gap-2 md:order-last md:text-xl sideways:order-none!`}
              >
                <BrandScribble
                  shape="screen"
                  className="size-6 text-sun group-disabled:text-white/50 motion-safe:group-hover:animate-wiggle"
                />
                Host on this screen
              </button>
              <p className="text-sm text-white/70">
                Show the game on a TV or laptop (or cast this screen to one). You run it and watch along, but don’t
                play.
              </p>
            </div>

            {problemLine}
            {backButton}
          </form>
        )}
      </main>
      <BrandFooter />
    </div>
  );
}
