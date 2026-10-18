/** Shared button and panel looks: the lobby, the phone view and the host screen. */
const button =
  "inline-flex items-center justify-center rounded-[12px_16px_14px_10px] py-3 font-display leading-none transition-transform focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-white active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";

/** The block buttons (the main actions): bigger type, a tilt and lift on hover, a squish when pressed. */
const block =
  "min-h-12 px-5 text-xl sm:min-h-14 sm:px-6 sm:text-2xl enabled:hover:-translate-y-0.5 enabled:hover:-rotate-1 enabled:active:scale-95 motion-reduce:transition-none";

const primaryButton = `${button} ${block} bg-sun text-night shadow-[0_4px_0_var(--color-amber),0_6px_0_var(--color-night-deep)]`;
const quietButton = `${button} ${block} bg-night-soft text-white hover:bg-iris/40`;
const ghostButton = `${button} min-h-12 px-5 text-lg text-white/75 hover:text-white`;
const panel = "rounded-[14px_18px_16px_12px] bg-night-deep/60 p-4";

export const BrandStyles = { primaryButton, quietButton, ghostButton, panel };
