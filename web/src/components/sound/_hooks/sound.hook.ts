import { useEffect, useRef, useSyncExternalStore } from "react";
import { SoundCuesUtils, type SoundMoment } from "@/components/sound/_utils/soundCues.utils";
import { SoundPlayer } from "@/components/sound/_utils/soundPlayer.utils";

/** Whether sound is muted on this device, kept in sync between every toggle on the page. */
export function useSoundMuted() {
  return useSyncExternalStore(SoundPlayer.subscribe, SoundPlayer.isMuted, () => false);
}

/** Plays the room's cues (turns, ticks, time's up) as the moment changes. Mount once per room, not per view. */
export function useSoundCues(moment: SoundMoment) {
  const previous = useRef(moment);
  useEffect(() => {
    for (const cue of SoundCuesUtils.between(previous.current, moment)) SoundPlayer.play(cue);
    previous.current = moment;
  });
}
