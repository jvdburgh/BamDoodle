import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { RoundUtils } from "@/components/room/_utils/round.utils";

type RoomGuessProps = {
  bamboozlerName: string;
  /** You are the bamboozler: you get the field. */
  yours: boolean;
  msLeft: number;
  onGuess: (text: string) => void;
};

/** The bamboozler's one chance at the word, even when everyone caught them. */
export function RoomGuess({ bamboozlerName, yours, msLeft, onGuess }: RoomGuessProps) {
  const [text, setText] = useState("");
  const fieldId = useId();
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (yours) field.current?.focus();
  }, [yours]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (text.trim()) onGuess(text);
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="font-display text-2xl">
        {yours ? "One guess: what was the word?" : `${bamboozlerName} gets one guess at the word…`}
      </p>
      <p className="font-display text-xl text-white/70 tabular-nums">
        <span className="sr-only">Time left to guess: </span>
        {RoundUtils.formatClock(msLeft)}
      </p>
      {yours && (
        <form onSubmit={submit} className="flex w-full max-w-sm gap-2">
          <label htmlFor={fieldId} className="sr-only">
            Your guess
          </label>
          <input
            ref={field}
            id={fieldId}
            value={text}
            maxLength={40}
            onChange={(event) => setText(event.target.value)}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-[10px_14px_12px_9px] bg-night-deep px-4 py-3 text-lg text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun"
          />
          <button type="submit" disabled={!text.trim()} className={BrandStyles.primaryButton}>
            Guess
          </button>
        </form>
      )}
    </div>
  );
}
