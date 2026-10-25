/** Fired on `window` when you confirm leaving the room (the logo's Leave), right before the page goes. */
const LEAVING_EVENT = "bamdoodle:leaving";

/** A click that opens the link elsewhere (a modifier, not the main button) leaves nothing behind. */
const opensElsewhere = (event: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/**
 * Mid-round, reloading or closing the tab asks first, with the browser's own prompt; after the logo's Leave (which
 * asked already) it doesn't ask again. Returns a function that stops guarding.
 */
function guard(target: Pick<EventTarget, "addEventListener" | "removeEventListener"> = window): () => void {
  const confirmLeave = (event: Event) => event.preventDefault();
  const leaving = () => target.removeEventListener("beforeunload", confirmLeave);
  target.addEventListener("beforeunload", confirmLeave);
  target.addEventListener(LEAVING_EVENT, leaving);
  return () => {
    target.removeEventListener("beforeunload", confirmLeave);
    target.removeEventListener(LEAVING_EVENT, leaving);
  };
}

export const LeaveGuardUtils = { LEAVING_EVENT, opensElsewhere, guard };
