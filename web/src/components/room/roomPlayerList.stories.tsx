import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { drawingFixture } from "@/components/canvas/_fixtures/drawing.fixture";
import { RoomPlayerList } from "./RoomPlayerList.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomPlayerList",
  component: RoomPlayerList,
  decorators: [
    (Story) => (
      <div className="w-[22rem]">
        <Story />
      </div>
    ),
  ],
  argTypes: { drawing: { control: false } },
  args: {
    players: playersFixture.slice(0, 4),
    drawing: drawingFixture(),
    youId: 2,
    activeId: 2,
    nextId: 3,
    spotlightId: null,
    onSpotlight: fn(),
    onPeek: fn(),
  },
  render: function Render(args) {
    const [spotlightId, setSpotlightId] = useState(args.spotlightId);
    const [chosenId, setChosenId] = useState<number | null>(null);
    return (
      <RoomPlayerList
        {...args}
        spotlightId={spotlightId}
        onSpotlight={(id) => {
          setSpotlightId(id);
          args.onSpotlight(id);
        }}
        action={
          args.action && {
            ...args.action,
            chosenId,
            onChoose: (id) => {
              setChosenId(id);
              args.action?.onChoose(id);
            },
          }
        }
      />
    );
  },
} satisfies Meta<typeof RoomPlayerList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TurnOrder: Story = {
  play: async ({ canvas }) => {
    const items = canvas.getAllByRole("listitem");
    await expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Pip"),
      expect.stringContaining("Juno"),
      expect.stringContaining("Mo"),
      expect.stringContaining("Kiki"),
    ]);
    await expect(items[1]).toHaveTextContent(/Juno.*you.*Drawing now/);
    await expect(items[2]).toHaveTextContent(/Mo.*Up next/);
    await waitFor(() => expect(canvas.getByRole("button", { name: "Spotlight Juno" })).toBeVisible());
  },
};

export const Spotlight: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const kiki = canvas.getByRole("button", { name: /Spotlight Kiki/ });
    await expect(kiki).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(kiki);
    await expect(args.onSpotlight).toHaveBeenLastCalledWith(4);
    await expect(kiki).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(kiki);
    await expect(args.onSpotlight).toHaveBeenLastCalledWith(null);
  },
};

export const PeekOnHover: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const mo = canvas.getByRole("button", { name: /Spotlight Mo/ });
    await userEvent.hover(mo);
    await expect(args.onPeek).toHaveBeenLastCalledWith(3);
    await userEvent.unhover(mo);
    await expect(args.onPeek).toHaveBeenLastCalledWith(null);
  },
};

/** Who suspects whom, by name; your own card stands out and isn't a button. */
export const WhoSuspectsWhom: Story = {
  args: { activeId: null, nextId: null, suspectedBy: { 3: [1, 2], 4: [1, 3, 5, 6] } },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText("suspected by you and Pip")).toBeVisible());
    await waitFor(() => expect(canvas.getByText("suspected by Pip, Mo and 2 more")).toBeVisible());
    await expect(canvas.getByText("you")).toBeVisible();
  },
};

export const MarkAsSuspicious: Story = {
  args: { action: { kind: "suspect", chosenId: null, onChoose: fn() } },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.queryByRole("button", { name: /\(Juno\)/ })).toBeNull();
    const mo = canvas.getByRole("button", { name: "Mark Mo as suspicious" });
    await userEvent.click(mo);
    await expect(args.action?.onChoose).toHaveBeenLastCalledWith(3);
    await expect(mo).toHaveAttribute("aria-pressed", "true");
    await expect(mo).toHaveAccessibleName("Mark Mo as suspicious");
    await userEvent.click(canvas.getByRole("button", { name: "Mark Pip as suspicious" }));
    await expect(args.action?.onChoose).toHaveBeenLastCalledWith(1);
    await expect(mo).toHaveAttribute("aria-pressed", "false");

    // The button under the name does the same, and says what you picked.
    await userEvent.click(canvas.getByRole("button", { name: "Suspect Kiki" }));
    await expect(args.action?.onChoose).toHaveBeenLastCalledWith(4);
    await expect(canvas.getByRole("button", { name: "Suspected Kiki" })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.queryByRole("button", { name: "Suspect Juno" })).toBeNull();
  },
};

/** In the final vote a tap on a face is the vote, and another face changes it: no separate button to lock it in. */
export const VoteByTappingAFace: Story = {
  args: { action: { kind: "vote", chosenId: null, onChoose: fn() }, votedIds: [1] },
  play: async ({ args, canvas, userEvent }) => {
    const kiki = canvas.getByRole("button", { name: "Vote for Kiki" });
    await userEvent.click(kiki);
    await expect(args.action?.onChoose).toHaveBeenLastCalledWith(4);
    await expect(kiki).toHaveAttribute("aria-pressed", "true");
    const mo = canvas.getByRole("button", { name: "Vote for Mo" });
    await userEvent.click(mo);
    await expect(args.action?.onChoose).toHaveBeenLastCalledWith(3);
    await expect(kiki).toHaveAttribute("aria-pressed", "false");
    await expect(canvas.queryByRole("button", { name: /^Pick/ })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Vote Pip" }));
    await expect(args.action?.onChoose).toHaveBeenLastCalledWith(1);
    await expect(canvas.getByRole("button", { name: "Your vote Pip" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(canvas.getByText("voted")).toBeVisible());
  },
};

/** After the vote the cards tell the story: the bamboozler in the hat, who voted for whom, then the points. */
export const AfterTheVote: Story = {
  args: {
    activeId: null,
    nextId: null,
    outcome: {
      bamboozlerId: 3,
      votes: { 1: 3, 2: 4, 4: 3, 3: 1 },
      scores: {
        1: { points: 1, right: true },
        2: { points: 0, right: false },
        3: { points: 0, right: false },
        4: { points: 1, right: true },
      },
      totals: { 1: 3, 2: 1, 3: 2, 4: 2 },
    },
  },
  play: async ({ canvas }) => {
    const cards = canvas.getAllByRole("listitem");
    await waitFor(() => expect(cards[2]).toHaveTextContent("bamboozler"));
    await expect(cards[0]).toHaveTextContent("voted Mo ✓, right");
    await expect(cards[1]).toHaveTextContent("voted Kiki ✗, wrong");
    await expect(cards[2]).toHaveTextContent("voted Pip");
    await expect(cards[2]).not.toHaveTextContent("right");
    await expect(cards[0]).toHaveTextContent("+1");
    await expect(cards[0]).toHaveTextContent("3 total");
  },
};

export const HostRow: Story = {
  args: { players: playersFixture, youId: null, layout: "row", suspectedBy: { 3: [1, 2] } },
  decorators: [
    (Story) => (
      <div className="w-[60rem]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("you")).toBeNull();
    await expect(canvas.queryByRole("button", { name: /suspicious \(/ })).toBeNull();
    await waitFor(() => expect(canvas.getByText("suspected by Pip and Juno")).toBeVisible());
  },
};
