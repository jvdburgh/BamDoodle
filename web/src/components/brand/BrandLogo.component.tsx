type BrandLogoProps = {
  className?: string;
  /** Makes the logo a link, usually home. */
  href?: string;
};

export function BrandLogo({ className, href }: BrandLogoProps) {
  const logo = <img src="/logo.svg" alt="BamDoodle" className={href ? "size-full" : className} />;
  if (!href) return logo;
  return (
    <a
      href={href}
      title="Back to the start page"
      className={`block shrink-0 rounded-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white ${className ?? ""}`}
    >
      {logo}
    </a>
  );
}
