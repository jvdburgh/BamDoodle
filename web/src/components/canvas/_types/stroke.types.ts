/** `[x, y, pressure]`, with x and y normalised to 0..1 of the canvas and pressure 0..1. */
export type StrokePoint = [number, number, number];

export type Stroke = {
  id: string;
  playerId: string;
  color: string;
  /** Diameter as a fraction of the canvas width, so every screen draws the same line. */
  size: number;
  /** False for a mouse: perfect-freehand simulates pressure from speed instead. */
  hasPressure: boolean;
  points: StrokePoint[];
};
