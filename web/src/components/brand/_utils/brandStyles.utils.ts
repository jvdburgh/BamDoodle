/**
 * Shared button and panel looks: the lobby, the phone view and the host screen. Disabled (`disabled`, or
 * `aria-disabled` for a button that keeps its focus), every button is the same quiet navy one with a dashed sun
 * outline and its label: clearly not ready, never a faded (muddy) sun. Focused, the white focus outline wins.
 */
const button =
  "inline-flex items-center justify-center rounded-[12px_16px_14px_10px] py-3 font-display leading-none transition-transform focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-white active:translate-y-0.5 disabled:cursor-not-allowed disabled:text-white/60 disabled:shadow-none disabled:outline-2 disabled:-outline-offset-2 disabled:outline-sun/60 disabled:outline-dashed aria-disabled:cursor-not-allowed aria-disabled:text-white/60 aria-disabled:shadow-none aria-disabled:not-focus-visible:outline-2 aria-disabled:not-focus-visible:-outline-offset-2 aria-disabled:not-focus-visible:outline-sun/60 aria-disabled:not-focus-visible:outline-dashed";

/** The block buttons (the main actions): bigger type, a tilt and lift on hover, a squish when pressed. */
const block =
  "min-h-12 px-5 text-xl sm:min-h-14 sm:px-6 sm:text-2xl motion-safe:enabled:not-aria-disabled:hover:-translate-y-0.5 motion-safe:enabled:not-aria-disabled:hover:-rotate-1 motion-safe:enabled:not-aria-disabled:active:scale-95";

/** The navy behind a disabled block button; a ghost button stays see-through. */
const disabledFill = "disabled:bg-night-soft/60 aria-disabled:bg-night-soft/60";

const primaryButton = `${button} ${block} ${disabledFill} bg-sun text-night shadow-[0_4px_0_var(--color-amber),0_6px_0_var(--color-night-deep)]`;
const quietButton = `${button} ${block} ${disabledFill} bg-night-soft text-white enabled:not-aria-disabled:hover:bg-iris/40`;
const ghostButton = `${button} min-h-12 px-5 text-lg text-white/75 enabled:not-aria-disabled:hover:text-white`;
const panel = "rounded-[14px_18px_16px_12px] bg-night-deep/60 p-4";

export const BrandStyles = { primaryButton, quietButton, ghostButton, panel };
