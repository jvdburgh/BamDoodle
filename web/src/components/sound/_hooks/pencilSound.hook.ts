import { useEffect } from "react";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import { PencilUtils } from "@/components/sound/_utils/pencil.utils";
import { SoundPlayer } from "@/components/sound/_utils/soundPlayer.utils";

/** The pencil sound follows whichever stroke is being drawn, yours or anyone else's, and stops when it ends. */
export function usePencilSound(drawing: Drawing) {
  useEffect(() => PencilUtils.follow(drawing, SoundPlayer), [drawing]);
}
