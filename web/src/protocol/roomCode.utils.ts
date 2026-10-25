/** Same as the server's room codes (`CODE_ALPHABET`, `CODE_LENGTH` in registry.rs): four consonants, no Y. */
const LETTERS = "BCDFGHJKLMNPQRSTVWXZ";
const LENGTH = 4;
const CODE = new RegExp(`^[${LETTERS}]{${LENGTH}}$`);
const NOT_IN_CODE = new RegExp(`[^${LETTERS}]`, "g");

/** The room code in `text`, upper-cased, or undefined when it isn't one. */
const parse = (text: string) => (CODE.test(text.toUpperCase()) ? text.toUpperCase() : undefined);

/** What a typed code keeps: its code letters, upper-cased, at most four. */
const clean = (text: string) => text.toUpperCase().replace(NOT_IN_CODE, "").slice(0, LENGTH);

export const RoomCodeUtils = { LETTERS, LENGTH, parse, clean };
