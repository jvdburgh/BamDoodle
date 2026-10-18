/** Shared button and panel looks: the lobby, the phone view and the host screen. */
const button =
  "inline-flex min-h-12 items-center justify-center rounded-[12px_16px_14px_10px] px-5 py-3 font-display text-lg leading-none transition-transform focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-white active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton = `${button} bg-sun text-night shadow-[0_4px_0_var(--color-amber),0_6px_0_var(--color-night-deep)] enabled:hover:-translate-y-0.5`;
const quietButton = `${button} bg-night-soft text-white hover:bg-iris/40`;
const ghostButton = `${button} text-white/75 hover:text-white`;
const panel = "rounded-[14px_18px_16px_12px] bg-night-deep/60 p-4";

export const BrandStyles = { primaryButton, quietButton, ghostButton, panel };
