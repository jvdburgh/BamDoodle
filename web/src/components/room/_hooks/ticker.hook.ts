import { useEffect, useLayoutEffect, useRef } from "react";

/** Calls `onTick(Date.now())` every `intervalMs` while `running`, for countdowns. */
export function useTicker(running: boolean, onTick: (now: number) => void, intervalMs = 100) {
  const tick = useRef(onTick);

  useLayoutEffect(() => {
    tick.current = onTick;
  });

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => tick.current(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [running, intervalMs]);
}
