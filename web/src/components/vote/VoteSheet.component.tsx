import { useEffect, useRef, type ReactNode } from "react";

/**
 * The final vote over everything else, on every screen size: a modal `<dialog>` that opens as it mounts and closes
 * as it goes (when the vote ends). Esc doesn't close it, since the vote ends by itself. Full screen on a phone, a
 * centred sheet on a laptop.
 */
export function VoteSheet({ children }: { children: ReactNode }) {
  const sheet = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = sheet.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // Browsers let a page refuse Esc (or Android's back) only so often, then close it anyway: open it again.
    const reopen = () => dialog.showModal();
    dialog.addEventListener("close", reopen);
    return () => {
      dialog.removeEventListener("close", reopen);
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={sheet}
      aria-label="Who’s sketchy?"
      onCancel={(event) => event.preventDefault()}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-night p-0 text-white backdrop:bg-night-deep/85 md:m-auto md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-3xl md:rounded-[20px_28px_24px_18px]"
    >
      <div className="grid gap-3 p-3 pb-[calc(1rem+var(--browser-bar))] md:gap-4 md:p-5">{children}</div>
    </dialog>
  );
}
