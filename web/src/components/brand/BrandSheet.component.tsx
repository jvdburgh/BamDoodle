import { useEffect, useRef, type ReactNode } from "react";
import { BrandStyles } from "@/components/brand/_utils/brandStyles.utils";

type BrandSheetProps = {
  /** The sheet's name for screen readers. */
  label: string;
  /** Lets it be closed (Esc, Android's back, a Close button). Without it the sheet stays until it unmounts. */
  onClose?: () => void;
  children: ReactNode;
};

/**
 * A sheet over everything: a modal `<dialog>` that opens as it mounts and closes as it goes. Full screen on a phone,
 * a centred sheet on a laptop. The final vote can't be dismissed (it ends by itself); how to play can.
 */
export function BrandSheet({ label, onClose, children }: BrandSheetProps) {
  const sheet = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  const dismissible = onClose !== undefined;

  useEffect(() => {
    const dialog = sheet.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // Closed by the browser (Esc, back): tell the owner, or, when it can't be dismissed, open it again. Browsers
    // let a page refuse those only so often.
    const closed = () => (closeRef.current ? closeRef.current() : dialog.showModal());
    dialog.addEventListener("close", closed);
    return () => {
      dialog.removeEventListener("close", closed);
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={sheet}
      aria-label={label}
      onCancel={dismissible ? undefined : (event) => event.preventDefault()}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-night p-0 text-white backdrop:bg-night-deep/85 md:m-auto md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-4xl md:rounded-[20px_28px_24px_18px]"
    >
      <div className="grid gap-3 p-3 pb-[calc(1rem+var(--browser-bar))] md:gap-4 md:p-5">
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            className={`${BrandStyles.ghostButton} sticky top-0 z-10 justify-self-end bg-night/90 px-4`}
          >
            Close
          </button>
        )}
        {children}
      </div>
    </dialog>
  );
}
