/** The `#sketchy` SVG filter behind the `sketchy` utility. Render it once per page, near the root. */
export function BrandSketchFilter() {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute size-0 overflow-hidden">
      <filter id="sketchy" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
