import { useEffect, useState } from "react";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";

type RoomShareButtonProps = {
  roomCode: string;
};

const COPIED_MS = 2_500;

/**
 * "Share link": the phone's own share sheet where there is one, otherwise the room's address (`bamdoodle.io/CODE`)
 * on the clipboard, with "Link copied" to say so.
 */
export function RoomShareButton({ roomCode }: RoomShareButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const path = `/${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BamDoodle",
          text: `Draw with us! Room ${roomCode}`,
          url: location.origin + path,
        });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a reason to copy instead.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(location.host + path);
    setCopied(true);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" onClick={share} className={`${BrandStyles.quietButton} gap-2`}>
        <span aria-hidden="true">🔗</span>
        Share link
      </button>
      <p role="status" className="text-sm text-sun">
        {copied ? "Link copied" : ""}
      </p>
    </div>
  );
}
