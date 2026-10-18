import { BrandScribble } from "@/components/brand/BrandScribble.component";

type RoomWordCardProps = {
  category: string;
  word: string;
};

export function RoomWordCard({ category, word }: RoomWordCardProps) {
  return (
    <p className="flex flex-col items-center text-center leading-none">
      <span className="text-sm text-white/60">The word, from {category}</span>
      <span className="relative mt-1 px-2 font-display text-3xl font-extrabold sm:text-4xl">
        {word}
        <BrandScribble
          shape="underline"
          seed={word.length}
          className="absolute inset-x-0 -bottom-2.5 h-3 w-full text-berry"
        />
      </span>
    </p>
  );
}
