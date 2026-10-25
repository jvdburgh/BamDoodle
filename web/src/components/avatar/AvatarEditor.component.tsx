import { useRef, useState } from "react";
import { AvatarDoodle } from "@/components/avatar/AvatarDoodle.component";
import type { AvatarEdit, AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { CanvasPalette } from "@/components/canvas/CanvasPalette.component";
import { useFrame } from "@/components/canvas/_hooks/frame.hook";
import { usePointerStroke } from "@/components/canvas/_hooks/pointerStroke.hook";
import type { StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

type AvatarEditorProps = {
  value: AvatarStroke[];
  onChange: (strokes: AvatarStroke[]) => void;
};

const control = `${BrandStyles.quietButton} px-3 aria-disabled:cursor-default aria-disabled:opacity-40`;

/** Draw on a round pad, starting from a doodle face: shuffle for another, undo any step, or clear and start blank. */
export function AvatarEditor({ value, onChange }: AvatarEditorProps) {
  const [past, setPast] = useState<AvatarStroke[][]>([]);
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
    const history = { past, present: value };
    const next = AvatarUtils.edit(history, action);
    setFull(next === history && action.kind === "draw");
    if (next === history) return;
    setPast(next.past);
    onChange(next.present);
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
    <div className="grid w-full justify-items-center gap-4">
      <div className="relative my-3 aspect-square w-full max-w-[min(14rem,34svh)]">
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
        <BrandScribble
          shape="ring"
          seed={5}
          weight={0.8}
          className="pointer-events-none absolute -inset-5 size-[calc(100%+2.5rem)] text-white/30"
        />
      </div>

      <div className="w-full max-w-64">
        <CanvasPalette colours={AvatarUtils.colours} value={colour} onChange={setColour} />
      </div>

      <div className="grid w-full max-w-64 grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => apply({ kind: "shuffle", seed: Math.floor(Math.random() * 2 ** 31) })}
          className={control}
        >
          Shuffle
        </button>
        <button
          type="button"
          aria-disabled={past.length === 0}
          onClick={() => apply({ kind: "undo" })}
          className={control}
        >
          Undo
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
      <p aria-live="polite" className="-mt-2 min-h-5 text-center text-sm text-white/70">
        {full ? "Your face is full: undo or clear to draw more." : ""}
      </p>
    </div>
  );
}
