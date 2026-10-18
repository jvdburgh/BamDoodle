import { useEffect } from "react";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import { PencilUtils } from "@/components/sound/_utils/pencil.utils";
import { SoundPlayer } from "@/components/sound/_utils/soundPlayer.utils";

/** The pencil sound follows whichever stroke is being drawn, yours or anyone else's, and stops when it ends. */
export function usePencilSound(drawing: Drawing) {
  useEffect(() => {
    let strokeId: string | null = null;
    let heard = 0;
    let at = 0;
    const unsubscribe = drawing.subscribe(() => {
      const live = drawing.live();
      if (!live) {
        if (strokeId !== null) SoundPlayer.pencilStop();
        strokeId = null;
        return;
      }
      const now = performance.now();
      if (live.id !== strokeId) {
        strokeId = live.id;
        heard = live.points.length;
        at = now;
        return;
      }
      if (live.points.length <= heard) return;
      SoundPlayer.pencilMove(PencilUtils.speed(live.points, heard, (now - at) / 1000));
      heard = live.points.length;
      at = now;
    });
    return () => {
      unsubscribe();
      SoundPlayer.pencilStop();
    };
  }, [drawing]);
}
