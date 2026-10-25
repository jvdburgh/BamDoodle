import type { ReactNode } from "react";
import { BrandSheet } from "@/components/brand/BrandSheet.component";
import { CanvasBoard } from "@/components/canvas/CanvasBoard.component";
import type { Drawing } from "@/components/canvas/_utils/drawing.utils";
import { RoomPlayerList, type RoomPlayerAction } from "@/components/room/RoomPlayerList.component";
import type { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import type { RoomPlayer } from "@/components/room/_types/room.types";
import { VotePrompt } from "@/components/vote/VotePrompt.component";

type VoteSheetProps = {
  /** Everyone playing this round, you included. */
  players: RoomPlayer[];
  youId: number;
  drawing: Drawing;
  order: number[];
  spotlight: ReturnType<typeof useSpotlight>;
  /** The vote: who you picked and what a tap does. */
  action: RoomPlayerAction;
  /** Who you suspected while drawing: that counts if you don't vote. */
  suspectedId: number | null;
  /** Who has voted (not for whom). */
  votedIds: number[];
  msLeft: number;
  category: string;
  /** The secret word; null for the bamboozler. */
  word: string | null;
  /** A lost connection or a turned-down vote: the sheet covers the page's own. */
  notice?: ReactNode;
};

/**
 * The final vote, a sheet over everything: the prompt stays at the top (time, the secret, who has voted), then the
 * finished drawing, sized to leave room for the cards, and a small card per other player with their lines and a Vote
 * button.
 */
export function VoteSheet({
  players,
  youId,
  drawing,
  order,
  spotlight,
  action,
  suspectedId,
  votedIds,
  msLeft,
  category,
  word,
  notice,
}: VoteSheetProps) {
  const byId = (id: number | null) => players.find((player) => player.id === id);

  return (
    <BrandSheet label="Who’s sketchy?">
      <div className="sticky top-0 z-10 grid gap-2">
        <VotePrompt
          players={players}
          voted={byId(action.chosenId)}
          suspected={byId(suspectedId)}
          votedIds={votedIds}
          msLeft={msLeft}
          category={category}
          word={word}
        />
        {notice}
      </div>
      {/* As big as leaves room for the cards: about two rows of them under it on a phone, all on its side. */}
      <div className="mx-auto w-full max-w-[min(36rem,calc((100svh-30rem)*4/3))] sideways:max-w-[calc((100svh-11.5rem)*4/3)]">
        <CanvasBoard
          drawing={drawing}
          order={order}
          activePlayerId={null}
          color="transparent"
          brushSize={0}
          spotlightId={spotlight.shown}
          label="The finished drawing."
        />
      </div>
      <RoomPlayerList
        players={players.filter((player) => player.id !== youId)}
        drawing={drawing}
        youId={youId}
        activeId={null}
        nextId={null}
        spotlightId={spotlight.pinned}
        onSpotlight={spotlight.pin}
        onPeek={spotlight.setPeek}
        action={action}
        yourVoteId={action.chosenId}
        votedIds={votedIds}
        layout="sheet"
      />
    </BrandSheet>
  );
}
