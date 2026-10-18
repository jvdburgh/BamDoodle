import type { CanvasSurface } from "@/components/canvas/CanvasBoard.component";

type RoomTurnCallProps = {
  /** Changes every turn, so the call-out plays again. */
  turn: number;
  text: string;
  surface?: CanvasSurface;
  /** Bigger for the host screen. */
  big?: boolean;
};

const halo: Record<CanvasSurface, string> = {
  paper: "text-night [text-shadow:0_0_4px_var(--color-paper),0_0_12px_var(--color-paper)]",
  night: "text-white [text-shadow:0_0_4px_var(--color-night-deep),0_0_12px_var(--color-night-deep)]",
};

/**
 * "Juno's turn" popping up over the canvas for a moment when the turn changes. Decorative: a live region elsewhere
 * announces turns, and reduced motion hides it.
 */
export function RoomTurnCall({ turn, text, surface = "paper", big = false }: RoomTurnCallProps) {
  return (
    <p
      key={turn}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-[38%] text-center font-display opacity-0 animate-turn-call motion-reduce:hidden ${
        big ? "text-5xl @4xl/room:text-7xl" : "text-4xl @md/room:text-6xl"
      } ${halo[surface]}`}
    >
      {text}
    </p>
  );
}
