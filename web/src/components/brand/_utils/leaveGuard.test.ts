import { describe, expect, it } from "vitest";
import { LeaveGuardUtils } from "@/components/brand/_utils/leaveGuard.utils";

const unload = (target: EventTarget) => {
  const event = new Event("beforeunload", { cancelable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
};

describe("LeaveGuardUtils.guard", () => {
  it("asks before the page goes, until you've said Leave already", () => {
    const page = new EventTarget();
    const stop = LeaveGuardUtils.guard(page);
    expect(unload(page)).toBe(true);
    page.dispatchEvent(new Event(LeaveGuardUtils.LEAVING_EVENT));
    expect(unload(page)).toBe(false);
    stop();
  });

  it("stops asking when the round is over", () => {
    const page = new EventTarget();
    LeaveGuardUtils.guard(page)();
    expect(unload(page)).toBe(false);
  });
});

describe("LeaveGuardUtils.opensElsewhere", () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  it("tells a plain click from one that opens a new tab", () => {
    expect(LeaveGuardUtils.opensElsewhere(click)).toBe(false);
    expect(LeaveGuardUtils.opensElsewhere({ ...click, ctrlKey: true })).toBe(true);
    expect(LeaveGuardUtils.opensElsewhere({ ...click, button: 1 })).toBe(true);
  });
});
