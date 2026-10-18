import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/** Returns a `schedule()` that runs `draw` once on the next animation frame, however often it is called. */
export function useFrame(draw: () => void) {
  const drawRef = useRef(draw);
  const frame = useRef(0);

  useLayoutEffect(() => {
    drawRef.current = draw;
  });

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  return useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      drawRef.current();
    });
  }, []);
}
