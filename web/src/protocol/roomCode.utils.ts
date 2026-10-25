/**
 * Same as the server's room codes (`CODE_ALPHABET`, `CODE_LENGTH`, `LOOKALIKES` in registry.rs): four consonants,
 * none that reads like another (no C, L, N, Q, Y).
 */
const LETTERS = "BDFGHJKMPRSTVWXZ";
const LENGTH = 4;
/** A typed look-alike and the code letter it stands for. L and Q have no twin among the letters: they're dropped. */
const LOOKALIKES: Record<string, string> = { C: "G", N: "M" };
const CODE = new RegExp(`^[${LETTERS}]{${LENGTH}}$`);
const LOOKALIKE = new RegExp(`[${Object.keys(LOOKALIKES).join("")}]`, "g");
const NOT_IN_CODE = new RegExp(`[^${LETTERS}]`, "g");

const read = (text: string) => text.toUpperCase().replace(LOOKALIKE, (letter) => LOOKALIKES[letter]!);

/** The room code in `text`, in any case and with look-alikes read as code letters, or undefined when it isn't one. */
const parse = (text: string) => (CODE.test(read(text)) ? read(text) : undefined);

/** What a typed code keeps: its code letters, upper-cased, look-alikes read as code letters, at most four. */
const clean = (text: string) => read(text).replace(NOT_IN_CODE, "").slice(0, LENGTH);

/** A room's own address, the one to share and to scan: `/BKZW`. */
const path = (code: string) => `/${code}`;

export const RoomCodeUtils = { LETTERS, LENGTH, LOOKALIKES, parse, clean, path };
