/**
 * Where a device keeps its seat token per room, so a refresh or a dropped connection takes the same seat back. The
 * token is only offered for the same name, so a second tab joining under another name gets a seat of its own.
 */
export type SessionTokenStore = {
  get(code: string, name: string): string | null;
  set(code: string, name: string, token: string): void;
};

type Saved = { name: string; token: string };

const keyFor = (code: string) => `bamdoodle:session:${code.toUpperCase()}`;
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const SessionTokenUtils = {
  /** `localStorage`, when the browser allows it (private windows and blocked storage just mean no seat to take back). */
  browser(storage: () => Storage | undefined = () => globalThis.localStorage): SessionTokenStore {
    return {
      get(code, name) {
        try {
          const saved = JSON.parse(storage()?.getItem(keyFor(code)) ?? "null") as Saved | null;
          return saved && sameName(saved.name, name) ? saved.token : null;
        } catch {
          return null;
        }
      },
      set(code, name, token) {
        try {
          storage()?.setItem(keyFor(code), JSON.stringify({ name, token } satisfies Saved));
        } catch {
          // No storage: the seat lasts as long as this page.
        }
      },
    };
  },

  memory(): SessionTokenStore {
    const tokens = new Map<string, Saved>();
    return {
      get(code, name) {
        const saved = tokens.get(keyFor(code));
        return saved && sameName(saved.name, name) ? saved.token : null;
      },
      set: (code, name, token) => void tokens.set(keyFor(code), { name, token }),
    };
  },
};
