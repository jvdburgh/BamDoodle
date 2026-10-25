import type { BrushSize } from "@/protocol/generated/BrushSize";

export type CanvasColour = { name: string; value: string };
/** `id` is the size on the wire, `size` the diameter as a fraction of the canvas width. */
export type CanvasBrush = { id: BrushSize; name: string; size: number };

/** Every colour for everyone: the logo's colours plus neutrals and the few a drawing needs that the logo lacks. */
const colours: CanvasColour[] = [
  { name: "Black", value: "#000000" },
  { name: "Night", value: "#080357" },
  { name: "Slate", value: "#6e6a8a" },
  { name: "Cloud", value: "#c9c7d9" },
  { name: "White", value: "#ffffff" },
  { name: "Cocoa", value: "#7a4a2a" },
  { name: "Sand", value: "#d9b27c" },
  { name: "Peach", value: "#f6c49e" },
  { name: "Blush", value: "#f9a8c0" },
  { name: "Berry", value: "#f13866" },
  { name: "Tomato", value: "#e8482c" },
  { name: "Sun", value: "#fbb03b" },
  { name: "Lemon", value: "#ffe14d" },
  { name: "Lime", value: "#7ec42e" },
  { name: "Forest", value: "#239447" },
  { name: "Lagoon", value: "#2da8c3" },
  { name: "Iris", value: "#5651fb" },
  { name: "Denim", value: "#3d56a5" },
  { name: "Violet", value: "#af2cbe" },
  { name: "Plum", value: "#9753a0" },
];

const brushes: CanvasBrush[] = [
  { id: "fine", name: "Fine", size: 0.006 },
  { id: "medium", name: "Medium", size: 0.014 },
  { id: "bold", name: "Bold", size: 0.03 },
];

export const CanvasTools = { colours, brushes };
