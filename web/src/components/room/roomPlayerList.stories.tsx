import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
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
    youId: "juno",
    activeId: "juno",
    nextId: "mo",
    spotlightId: null,
    onSpotlight: fn(),
    onPeek: fn(),
  },
  render: function Render(args) {
    const [spotlightId, setSpotlightId] = useState(args.spotlightId);
    const [chosenId, setChosenId] = useState<string | null>(null);
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
    await expect(canvas.getByRole("button", { name: /Juno.*\(you\).*Drawing now/ })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Mo\W+Up next/ })).toBeVisible();
  },
};

export const Spotlight: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const kiki = canvas.getByRole("button", { name: /Spotlight Kiki/ });
    await expect(kiki).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(kiki);
    await expect(args.onSpotlight).toHaveBeenLastCalledWith("kiki");
    await expect(kiki).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(kiki);
    await expect(args.onSpotlight).toHaveBeenLastCalledWith(null);
  },
};

export const PeekOnHover: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const mo = canvas.getByRole("button", { name: /Spotlight Mo/ });
    await userEvent.hover(mo);
    await expect(args.onPeek).toHaveBeenLastCalledWith("mo");
    await userEvent.unhover(mo);
    await expect(args.onPeek).toHaveBeenLastCalledWith(null);
  },
};

export const MarkAsSketchy: Story = {
  args: { action: { kind: "suspect", chosenId: null, onChoose: fn() } },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.queryByRole("button", { name: /\(Juno\)/ })).toBeNull();
    const mo = canvas.getByRole("button", { name: /sketchy \(Mo\)/ });
    await userEvent.click(mo);
    await expect(args.action?.onChoose).toHaveBeenLastCalledWith("mo");
    await expect(mo).toHaveAttribute("aria-pressed", "true");
    await expect(mo).toHaveTextContent("Marked sketchy");
    await userEvent.click(canvas.getByRole("button", { name: /sketchy \(Pip\)/ }));
    await expect(args.action?.onChoose).toHaveBeenLastCalledWith("pip");
    await expect(mo).toHaveAttribute("aria-pressed", "false");
  },
};

export const PickInTheFinalVote: Story = {
  args: { action: { kind: "vote", chosenId: null, onChoose: fn() }, votedIds: ["pip"] },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Pick (Kiki)" }));
    await expect(args.action?.onChoose).toHaveBeenLastCalledWith("kiki");
    await expect(canvas.getByText("voted")).toBeVisible();
  },
};

export const HostRow: Story = {
  args: { players: playersFixture, youId: null, layout: "row", suspectedBy: { mo: 2 } },
  decorators: [
    (Story) => (
      <div className="w-[60rem]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("(you)")).toBeNull();
    await expect(canvas.queryByRole("button", { name: /sketchy \(/ })).toBeNull();
    await expect(canvas.getByText("suspected by 2")).toBeVisible();
  },
};
