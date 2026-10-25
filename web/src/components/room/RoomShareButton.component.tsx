import { useEffect, useState } from "react";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { RoomCodeUtils } from "@/protocol/roomCode.utils";

type RoomShareButtonProps = {
  roomCode: string;
};

const COPIED = "Link copied";
const COPIED_MS = 2_500;

/**
 * "Share link": the phone's own share sheet where there is one, otherwise the room's address (`bamdoodle.io/CODE`)
 * on the clipboard, with "Link copied" to say so.
 */
export function RoomShareButton({ roomCode }: RoomShareButtonProps) {
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (status !== COPIED) return;
    const timer = window.setTimeout(() => setStatus(""), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const share = async () => {
    const path = RoomCodeUtils.path(roomCode);
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
    try {
      await navigator.clipboard.writeText(location.host + path);
      setStatus(COPIED);
    } catch {
      // No clipboard here (a page that isn't https, or permission denied): the address to type, then.
      setStatus(`Send them ${location.host + path}`);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" onClick={share} className={`${BrandStyles.quietButton} gap-2`}>
        <span aria-hidden="true">🔗</span>
        Share link
      </button>
      <p role="status" className="text-sm text-sun">
        {status}
      </p>
    </div>
  );
}
