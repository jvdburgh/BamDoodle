import { useRef, useState, type ReactNode } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { AvatarEdit, AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { ScribbleUtils } from "@/components/brand/_utils/scribble.utils";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { CanvasPalette } from "@/components/canvas/CanvasPalette.component";
import { useFrame } from "@/components/canvas/_hooks/frame.hook";
import { usePointerStroke } from "@/components/canvas/_hooks/pointerStroke.hook";
import type { StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

type AvatarEditorProps = {
  value: AvatarStroke[];
  onChange: (strokes: AvatarStroke[]) => void;
  /** The screen's next step, under the colours and buttons (beside the pad on a phone on its side). */
  children?: ReactNode;
};

const control = `${BrandStyles.quietButton} px-3`;

/** A doodled ring just outside the pad's edge (radius 50 of 100), centred on it: barely any wobble, a small overlap. */
const RING = CanvasUtils.freehandPath(
  ScribbleUtils.loop(5, { cx: 50, cy: 50, rx: 53, ry: 53, turns: 1.04, wobble: 0.008, start: -Math.PI / 3 }),
  2.2,
);

/** Draw on a round pad, starting empty: randomize for a doodle face to start from, or clear and start over. */
export function AvatarEditor({ value, onChange, children }: AvatarEditorProps) {
  const [colour, setColour] = useState(AvatarUtils.white);
  const [full, setFull] = useState(false);
  const liveRef = useRef<SVGPathElement>(null);
  const live = useRef<{ hasPressure: boolean; points: StrokePoint[] } | null>(null);

  const schedule = useFrame(() => {
    const stroke = live.current;
    liveRef.current?.setAttribute(
      "d",
      stroke ? CanvasUtils.strokeToPath({ ...stroke, size: AvatarUtils.brushSize }, 100, 100, false) : "",
    );
  });

  const apply = (action: AvatarEdit) => {
    const next = AvatarUtils.edit(value, action);
    setFull(next === value && action.kind === "draw");
    if (next !== value) onChange(next);
  };

  const { handlers } = usePointerStroke({
    enabled: true,
    onBegin: (point, hasPressure) => {
      live.current = { hasPressure, points: [point] };
      schedule();
    },
    onExtend: (points) => {
      live.current?.points.push(...points);
      schedule();
    },
    onEnd: () => {
      const stroke = live.current;
      live.current = null;
      liveRef.current?.setAttribute("d", "");
      if (!stroke) return;
      apply({ kind: "draw", stroke: AvatarUtils.stroke(stroke.points, colour, stroke.hasPressure) });
    },
  });

  return (
    <div className="grid w-full justify-items-center gap-4 sideways:grid-cols-[auto_minmax(0,1fr)] sideways:items-center sideways:gap-x-8 sideways:gap-y-2">
      <div className="relative my-3 aspect-square w-full max-w-[min(14rem,30svh)] sideways:row-span-4 sideways:my-0 sideways:w-[min(14rem,calc(100svh-7rem))] sideways:max-w-none">
        <AvatarDoodle strokes={value} className="absolute inset-0 size-full" />
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label="Avatar drawing pad"
          className="absolute inset-0 size-full cursor-crosshair touch-none [clip-path:circle(50%)]"
          {...handlers}
        >
          <path ref={liveRef} fill={colour} />
        </svg>
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute inset-0 size-full overflow-visible text-white/30"
        >
          <path d={RING} fill="currentColor" />
        </svg>
      </div>

      <div className="w-full max-w-64">
        <CanvasPalette colours={AvatarUtils.colours} value={colour} onChange={setColour} />
      </div>

      <div className="grid w-full max-w-64 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => apply({ kind: "randomize", seed: Math.floor(Math.random() * 2 ** 31) })}
          className={control}
        >
          Randomize
        </button>
        <button
          type="button"
          aria-disabled={value.length === 0}
          onClick={() => apply({ kind: "clear" })}
          className={control}
        >
          Clear
        </button>
      </div>
      <p aria-live="polite" className="-mt-2 min-h-5 text-center text-sm text-white/70 sideways:mt-0 sideways:min-h-0">
        {full
          ? "Your face is full: clear it to draw more."
          : value.length === 0
            ? "Draw your face, or leave it empty for a random one."
            : ""}
      </p>
      {children}
    </div>
  );
}
