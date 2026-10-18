type RoomTurnCallProps = {
  /** Changes every turn, so the call-out plays again. */
  turn: number;
  text: string;
  /** Bigger for the host screen. */
  big?: boolean;
};

/**
 * "Juno's turn" popping up over the canvas for a moment when the turn changes. Decorative: a live region elsewhere
 * announces turns, and reduced motion hides it.
 */
export function RoomTurnCall({ turn, text, big = false }: RoomTurnCallProps) {
  return (
    <p
      key={turn}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-[38%] text-center font-display text-night opacity-0 animate-turn-call [text-shadow:0_0_4px_var(--color-paper),0_0_12px_var(--color-paper)] motion-reduce:hidden ${
        big ? "text-5xl @4xl/room:text-7xl" : "text-4xl @md/room:text-6xl"
      }`}
    >
      {text}
    </p>
  );
}
