type BrandTaglineProps = {
  className?: string;
};

/** Draw • Guess • Deceive, with the dots in berry. */
export function BrandTagline({ className = "" }: BrandTaglineProps) {
  return (
    <p className={`text-white/70 ${className}`}>
      Draw <span className="text-berry">•</span> Guess <span className="text-berry">•</span> Deceive
    </p>
  );
}
