import type { Stroke } from "@/components/canvas/_types/stroke.types";

/** One line of an avatar: a canvas stroke without the room's ids, normalised to the avatar's square. */
export type AvatarStroke = Omit<Stroke, "id" | "playerId">;

/** What the editor can undo: every earlier avatar, newest last. */
export type AvatarHistory = { past: AvatarStroke[][]; present: AvatarStroke[] };

export type AvatarEdit =
  | { kind: "draw"; stroke: AvatarStroke }
  | { kind: "undo" }
  | { kind: "clear" }
  | { kind: "shuffle"; seed: number };
