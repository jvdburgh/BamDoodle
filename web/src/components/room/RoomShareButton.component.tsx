import { useEffect, useRef, useState } from "react";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";
import { RoomCodeUtils } from "@/protocol/roomCode.utils";

type RoomShareButtonProps = {
  roomCode: string;
};

const COPIED = "Link copied";
const COPIED_MS = 2_500;

/**
 * The room's link to send around: written out (`bamdoodle.io/BKZW`) to read aloud, and Copy link puts it on the
 * clipboard (`https://bamdoodle.io/BKZW`) with "Link copied" to say so. Without the Clipboard API (a page that isn't
 * https) the written link is selected and copied the old way; failing that, it stays selected to copy by hand.
 */
export function RoomShareButton({ roomCode }: RoomShareButtonProps) {
  const [status, setStatus] = useState("");
  const linkRef = useRef<HTMLSpanElement>(null);
  const path = RoomCodeUtils.path(roomCode);

  useEffect(() => {
    if (status !== COPIED) return;
    const timer = window.setTimeout(() => setStatus(""), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.origin + path);
      setStatus(COPIED);
      return;
    } catch {
      // No Clipboard API here, or permission denied: the written link, then.
    }
    const link = linkRef.current;
    if (link) document.getSelection()?.selectAllChildren(link);
    // The one way to copy without the Clipboard API; deprecated, but still in every browser.
    const copied = link !== null && document.execCommand("copy");
    setStatus(copied ? COPIED : "Couldn’t copy it: copy the link above by hand");
  };

  return (
    <div className="grid justify-items-center gap-2">
      <p className="text-sm text-white/80">
        Send the link{" "}
        <span ref={linkRef} className="font-semibold text-white select-all">
          {location.host + path}
        </span>
      </p>
      <button type="button" onClick={copy} className={`${BrandStyles.quietButton} gap-2`}>
        <span aria-hidden="true">🔗</span>
        Copy link
      </button>
      <p role="status" className="min-h-5 text-center text-sm text-sun">
        {status}
      </p>
    </div>
  );
}
