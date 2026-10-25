import type { Stroke } from "@/components/canvas/_types/stroke.types";

/** One line of an avatar: a canvas stroke without the room's ids, normalised to the avatar's square. */
export type AvatarStroke = Omit<Stroke, "id" | "playerId">;

export type AvatarEdit =
  | { kind: "draw"; stroke: AvatarStroke }
  | { kind: "clear" }
  | { kind: "randomize"; seed: number };
