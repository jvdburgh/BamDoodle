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

/**
 * The alternative to free colours: one shade family per player, light to dark, built around a logo colour.
 * Six families for up to six players.
 */
const shadeFamilies: CanvasColour[][] = [
  ["#fbc4d2", "#f7849f", "#f13866", "#c4204a", "#8a1232"].map((value, i) => ({ name: `Berry ${i + 1}`, value })),
  ["#b5e6f0", "#6fcde0", "#2da8c3", "#1f7f95", "#135566"].map((value, i) => ({ name: `Lagoon ${i + 1}`, value })),
  ["#fde3b0", "#fcc96f", "#fbb03b", "#d98a1c", "#9c5f0e"].map((value, i) => ({ name: `Sun ${i + 1}`, value })),
  ["#e7b5ee", "#cf6fdc", "#af2cbe", "#852091", "#5a1563"].map((value, i) => ({ name: `Violet ${i + 1}`, value })),
  ["#cdeba6", "#9fd65e", "#7ec42e", "#239447", "#1c5e31"].map((value, i) => ({ name: `Lime ${i + 1}`, value })),
  ["#c9c7fe", "#8f8bfd", "#5651fb", "#3d38c9", "#26238a"].map((value, i) => ({ name: `Iris ${i + 1}`, value })),
];

const brushes: CanvasBrush[] = [
  { id: "fine", name: "Fine", size: 0.006 },
  { id: "medium", name: "Medium", size: 0.014 },
  { id: "bold", name: "Bold", size: 0.03 },
];

export const CanvasTools = { colours, shadeFamilies, brushes };
