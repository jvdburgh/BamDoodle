import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";
import { drawingFixture } from "@/components/canvas/_fixtures/drawing.fixture";
import { morePlayersFixture, playersFixture } from "@/components/room/_fixtures/players.fixture";
import { useSpotlight } from "@/components/room/_hooks/spotlight.hook";
import { VoteSheet } from "./VoteSheet.component";

const everyone = [...playersFixture, ...morePlayersFixture];

const meta = {
  title: "Vote/VoteSheet",
  component: VoteSheet,
  parameters: { layout: "fullscreen" },
  argTypes: { drawing: { control: false }, spotlight: { control: false } },
  args: {
    players: everyone,
    youId: 2,
    drawing: drawingFixture(),
    order: everyone.map((player) => player.id),
    spotlight: { pinned: null, shown: null, pin: fn(), setPeek: fn() },
    action: { kind: "vote", chosenId: null, onChoose: fn() },
    suspectedId: 4,
    votedIds: [1, 2, 7],
    msLeft: 24_000,
    category: "Animals",
    word: "Giraffe",
  },
  // The spotlight is a hook's result and the vote is the view's state: a small harness holds both.
  render: function Render(args) {
    const spotlight = useSpotlight();
    const [chosenId, setChosenId] = useState(args.action.chosenId);
    return (
      <VoteSheet
        {...args}
        spotlight={spotlight}
        action={{
          ...args.action,
          chosenId,
          onChoose: (id) => {
            setChosenId(id);
            args.action.onChoose(id);
          },
        }}
      />
    );
  },
} satisfies Meta<typeof VoteSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const sheet = () => within(document.body).getByRole("dialog", { name: "Who’s sketchy?" });

/** Eight players: your own card is left out, everyone else is a small card with a quiet Vote button. */
export const FullRoom: Story = {
  play: async ({ args, userEvent }) => {
    const cards = within(within(sheet()).getByRole("list", { name: "Players" })).getAllByRole("listitem");
    await expect(cards).toHaveLength(7);
    await expect(within(sheet()).queryByRole("button", { name: "Vote Juno" })).toBeNull();
    await expect(within(sheet()).getByText("3 of 8 voted")).toBeVisible();
    await expect(within(sheet()).getByRole("img", { name: "The finished drawing." })).toBeVisible();
    // "voted ✓" sits beside the name; it says who has voted, never for whom.
    await expect(cards[0]).toHaveTextContent("Pipvoted ✓");
    await expect(cards[1]).not.toHaveTextContent("voted");

    await userEvent.click(within(sheet()).getByRole("button", { name: "Vote Mo" }));
    await expect(args.action.onChoose).toHaveBeenCalledWith(3);
    await expect(within(sheet()).getByRole("button", { name: "Your vote Mo" })).toHaveAttribute("aria-pressed", "true");
    await expect(within(sheet()).getByText(/You voted/)).toHaveTextContent("You voted Mo.");
  },
};

/** The prompt stays at the top of the sheet while the cards scroll under it. */
export const PromptStaysInView: Story = {
  play: async () => {
    const dialog = sheet();
    dialog.scrollTop = dialog.scrollHeight;
    const heading = within(dialog).getByRole("heading", { name: "Time’s up! Who’s sketchy?" });
    await expect(heading.getBoundingClientRect().top).toBeGreaterThanOrEqual(dialog.getBoundingClientRect().top);
    await expect(heading.getBoundingClientRect().bottom).toBeLessThanOrEqual(dialog.getBoundingClientRect().top + 120);
  },
};

/** The bamboozler's sheet says so where the word would be. */
export const Bamboozler: Story = {
  args: { word: null },
  play: async () => {
    await expect(within(sheet()).getByText("??? You’re the bamboozler")).toBeVisible();
  },
};
