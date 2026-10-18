import { BrandScribble } from "@/components/brand/BrandScribble.component";
import { useSoundMuted } from "@/components/sound/_hooks/sound.hook";
import { SoundPlayer } from "@/components/sound/_utils/soundPlayer.utils";

type SoundToggleProps = {
  className?: string;
};

/** Sound on or off for this device, remembered between visits. */
export function SoundToggle({ className = "" }: SoundToggleProps) {
  const muted = useSoundMuted();
  return (
    <button
      type="button"
      aria-pressed={!muted}
      onClick={() => {
        SoundPlayer.setMuted(!muted);
        if (muted) SoundPlayer.play("pick");
      }}
      title={muted ? "Sound is off" : "Sound is on"}
      className={`grid size-11 place-items-center rounded-full bg-night-soft/70 text-white hover:bg-night-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${muted ? "text-white/60" : ""} ${className}`}
    >
      <span className="sr-only">Sound</span>
      <BrandScribble shape={muted ? "speakerOff" : "speaker"} className="size-6" />
    </button>
  );
}
