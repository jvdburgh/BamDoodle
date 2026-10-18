type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return <img src="/logo.svg" alt="BamDoodle" className={className} />;
}
