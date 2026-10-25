import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

/** Whether background music is on on this device (its own choice, or the screen's default). */
export function useMusicOn() {
  return useSyncExternalStore(SoundPlayer.subscribe, SoundPlayer.isMusicOn, () => false);
}

/** This screen has music: full in the lobby and between rounds, `ducked` while someone draws or votes. */
export function useMusic(ducked: boolean, byDefault: boolean) {
  const claim = useRef<ReturnType<typeof SoundPlayer.claimMusic> | null>(null);
  const [first] = useState({ ducked, byDefault });
  // Claimed once per mount and updated in place, so a screen keeps its place under the ones opened after it.
  useEffect(() => {
    const own = SoundPlayer.claimMusic(first);
    claim.current = own;
    return () => {
      own.release();
      claim.current = null;
    };
  }, [first]);
  useEffect(() => claim.current?.update({ ducked, byDefault }), [ducked, byDefault]);
}
