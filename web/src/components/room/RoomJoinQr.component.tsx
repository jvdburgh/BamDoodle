import qrcode from "qrcode-generator";
import { useMemo } from "react";
import { RouteUtils } from "@/app/route.utils";

type RoomJoinQrProps = {
  roomCode: string;
  className?: string;
};

/** Light modules around the code, so a camera finds its edges. */
const QUIET_ZONE = 2;

/** The room's own address as a QR code, drawn here (no network), dark modules in the current text colour on paper. */
export function RoomJoinQr({ roomCode, className = "" }: RoomJoinQrProps) {
  const url = `${window.location.origin}${RouteUtils.roomPath(roomCode)}`;
  const { size, path } = useMemo(() => {
    const code = qrcode(0, "M");
    code.addData(url);
    code.make();
    const count = code.getModuleCount();
    let modules = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (code.isDark(row, col)) modules += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
    return { size: count + QUIET_ZONE * 2, path: modules };
  }, [url]);

  return (
    <svg
      role="img"
      aria-label={`QR code to join: ${url}`}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`block rounded-[6px_8px_7px_5px] bg-paper text-night ${className}`}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
