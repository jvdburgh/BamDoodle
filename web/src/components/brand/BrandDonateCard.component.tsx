import { BrandSupportLine } from "@/components/brand/BrandFooter.component";

/** After the last round, the one thing we ask for, in the footer's words. */
export function BrandDonateCard() {
  return (
    <aside
      aria-label="Support"
      className="max-w-md rounded-[14px_18px_16px_12px] bg-night-deep/70 px-5 py-3 text-center"
    >
      <BrandSupportLine className="text-white/80" />
    </aside>
  );
}
