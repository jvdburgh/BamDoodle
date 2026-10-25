type RoomTurnCallProps = {
  /** Changes every turn, so the call-out plays again. */
  turn: number;
  text: string;
  /**
   * The host screen: its header already says whose turn it is, so the call is a quick nod near the top that doesn't
   * hide the drawing.
   */
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
      className={`pointer-events-none absolute inset-x-0 text-center font-display text-night opacity-0 animate-turn-call [text-shadow:0_0_4px_var(--color-paper),0_0_12px_var(--color-paper)] motion-reduce:hidden ${
        big ? "top-[4%] text-4xl [animation-duration:700ms] @7xl/room:text-5xl" : "top-[38%] text-4xl @md/room:text-6xl"
      }`}
    >
      {text}
    </p>
  );
}
