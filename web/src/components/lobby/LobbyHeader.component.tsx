import { BrandLogo } from "@/components/brand/BrandLogo.component";
import { SoundToggle } from "@/components/sound/SoundToggle.component";

type LobbyHeaderProps = {
  /** Once the room exists: "Room BKZW" beside the toggles. */
  roomCode?: string;
  /** Where the logo goes: the start page. */
  home?: string;
};

/** The top of the screens around the start page (the forms, the setup, your face): the small logo, home, and the toggles. */
export function LobbyHeader({ roomCode, home = "/" }: LobbyHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      {/* Beside the room code, a narrow phone has no room for the name. */}
      <BrandLogo
        named
        href={home}
        // Inside a room (your face, the room's settings) leaving asks first, as it does in the room itself.
        confirmLeave={roomCode !== undefined}
        className="size-10"
        nameClassName={roomCode ? "sr-only text-sm sm:not-sr-only" : "text-sm"}
      />
      <div className="flex items-center gap-1.5">
        {roomCode && (
          <p className="rounded-full bg-night-soft px-3 py-1 text-sm whitespace-nowrap text-white/80">
            Room <span className="font-display tracking-widest">{roomCode}</span>
          </p>
        )}
        <SoundToggle channel="music" />
        <SoundToggle />
      </div>
    </header>
  );
}
