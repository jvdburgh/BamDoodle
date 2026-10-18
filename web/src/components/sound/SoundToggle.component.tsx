import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { useMusicOn, useSoundMuted } from "@/components/sound/_hooks/sound.hook";
import { SoundPlayer } from "@/components/sound/_utils/soundPlayer.utils";

type SoundToggleProps = {
  /** The sound effects (the default) or the background music; each is remembered on this device. */
  channel?: "effects" | "music";
  className?: string;
};

/** Sound effects or music on or off for this device, remembered between visits. */
export function SoundToggle({ channel = "effects", className = "" }: SoundToggleProps) {
  const muted = useSoundMuted();
  const musicOn = useMusicOn();
  const music = channel === "music";
  const on = music ? musicOn : !muted;
  const label = music ? "Music" : "Sound";
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        if (music) SoundPlayer.setMusicOn(!on);
        else {
          SoundPlayer.setMuted(on);
          if (!on) SoundPlayer.play("pick");
        }
      }}
      title={`${label} is ${on ? "on" : "off"}`}
      className={`grid size-11 place-items-center rounded-full bg-night-soft/70 text-white hover:bg-night-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${on ? "" : "text-white/60"} ${className}`}
    >
      <span className="sr-only">{label}</span>
      <BrandScribble shape={music ? (on ? "note" : "noteOff") : on ? "speaker" : "speakerOff"} className="size-6" />
    </button>
  );
}
