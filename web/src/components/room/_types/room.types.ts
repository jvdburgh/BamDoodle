export type RoomPlayer = {
  id: string;
  name: string;
  /** Seed for the placeholder doodle avatar. */
  avatarSeed: number;
};

export type TurnMode = "classic" | "timed";

/** Everyone on their own device (the main way to play), or one device passed round or on a big screen. */
export type DeviceMode = "own" | "shared";

export type RoundPhase = "waiting" | "drawing" | "over";

export type Round = {
  mode: TurnMode;
  phase: RoundPhase;
  /** Turns started this round; the active player is `turnCount % players`. */
  turnCount: number;
  roundStartedAt: number;
  turnStartedAt: number;
};
