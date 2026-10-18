import { BrandLogo } from "@/components/brand/BrandLogo.component";

export function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <BrandLogo className="size-32" />
      <h1 className="font-display text-5xl font-bold">BamDoodle</h1>
      <p className="text-xl text-white/80">
        Draw <span className="text-berry">•</span> Guess <span className="text-berry">•</span> Deceive
      </p>
    </main>
  );
}
