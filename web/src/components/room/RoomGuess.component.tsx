import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { ClockUtils } from "@/components/room/_utils/clock.utils";

type RoomGuessProps = {
  bamboozlerName: string;
  /** The round's category: the bamboozler's only clue. */
  category: string;
  /** You are the bamboozler: you get the field. */
  yours: boolean;
  msLeft: number;
  onGuess: (text: string) => void;
};

/**
 * The bamboozler's one chance at the word, even when everyone caught them. "Not too picky about spelling" holds as long
 * as the server forgives case, accents, spaces and one typo in words of five letters or more (`server/src/room/guess.rs`).
 */
export function RoomGuess({ bamboozlerName, category, yours, msLeft, onGuess }: RoomGuessProps) {
  const [text, setText] = useState("");
  const fieldId = useId();
  const hintId = useId();
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (yours) field.current?.focus();
  }, [yours]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (text.trim()) onGuess(text);
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center sideways:gap-2">
      <div className="flex flex-wrap items-baseline justify-center gap-x-3">
        <p className="font-display text-2xl sideways:text-xl">
          {yours ? `Your one guess at the word (${category}).` : `${bamboozlerName} gets one guess at the word…`}
        </p>
        <p className="font-display text-xl text-white/70 tabular-nums">
          <span className="sr-only">Time left to guess: </span>
          {ClockUtils.format(msLeft)}
        </p>
      </div>
      {yours && (
        <form onSubmit={submit} className="grid w-full max-w-sm gap-1.5">
          <div className="flex gap-2">
            <label htmlFor={fieldId} className="sr-only">
              Your guess
            </label>
            <input
              ref={field}
              id={fieldId}
              value={text}
              maxLength={40}
              aria-describedby={hintId}
              onChange={(event) => setText(event.target.value)}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-[10px_14px_12px_9px] bg-night-deep px-4 py-3 text-lg text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun"
            />
            <button type="submit" disabled={!text.trim()} className={BrandStyles.primaryButton}>
              Guess
            </button>
          </div>
          <p id={hintId} className="text-sm text-white/70">
            No worries, we’re not too picky about spelling.
          </p>
        </form>
      )}
    </div>
  );
}
