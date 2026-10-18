import { useEffect, type RefObject } from "react";

/**
 * Keeps a canvas buffer at CSS size × devicePixelRatio, also when the ratio changes (zoom, another monitor).
 * `onResize` gets the new buffer size in pixels.
 */
export function useCanvasSize(
  ref: RefObject<HTMLCanvasElement | null>,
  onResize: (width: number, height: number) => void,
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let media: MediaQueryList | null = null;

    const measure = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      onResize(width, height);
    };

    const watchRatio = () => {
      media?.removeEventListener("change", onRatioChange);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      media.addEventListener("change", onRatioChange);
    };

    function onRatioChange() {
      measure();
      watchRatio();
    }

    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    watchRatio();
    measure();
    return () => {
      observer.disconnect();
      media?.removeEventListener("change", onRatioChange);
    };
  }, [ref, onResize]);
}
