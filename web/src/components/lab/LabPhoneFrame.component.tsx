import type { ReactNode } from "react";

type LabPhoneFrameProps = {
  label: string;
  children: ReactNode;
};

/** A phone-sized box (390 × 844 CSS px) so one desktop can show the player view next to the host screen. */
export function LabPhoneFrame({ label, children }: LabPhoneFrameProps) {
  return (
    <section aria-label={label} className="flex shrink-0 flex-col items-center gap-2">
      <div className="h-[min(844px,calc(100svh-4rem))] w-[390px] overflow-hidden rounded-[44px] border-[6px] border-night-deep bg-night shadow-[0_0_0_2px_var(--color-night-soft)]">
        <div className="size-full overflow-y-auto">{children}</div>
      </div>
      <p aria-hidden="true" className="text-sm text-white/60">
        {label}
      </p>
    </section>
  );
}
