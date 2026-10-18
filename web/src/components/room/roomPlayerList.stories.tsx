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
      <div className="@container/room w-[24rem]">
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
    return (
      <RoomPlayerList
        {...args}
        spotlightId={spotlightId}
        onSpotlight={(id) => {
          setSpotlightId(id);
          args.onSpotlight(id);
        }}
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
    await expect(canvas.getByRole("button", { name: /Juno.*\(you\)/ })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Juno.*Drawing now/ })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Mo\W+Up next/ })).toBeVisible();
  },
};

export const PeekOnHover: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const mo = canvas.getByRole("button", { name: /Spotlight Mo/ });
    await userEvent.hover(mo);
    await expect(args.onPeek).toHaveBeenLastCalledWith("mo");
    await userEvent.unhover(mo);
    await expect(args.onPeek).toHaveBeenLastCalledWith(null);
    await expect(mo).toHaveAttribute("aria-pressed", "false");
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
    await expect(kiki).toHaveAttribute("aria-pressed", "false");
  },
};

export const SpotlightByKeyboard: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: /Spotlight Pip/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onSpotlight).toHaveBeenLastCalledWith("pip");
  },
};

export const SixInARail: Story = {
  args: { players: playersFixture, colours: { pip: "#f13866", juno: "#2da8c3" } },
  decorators: [
    (Story) => (
      <div className="@container/room w-[60rem]">
        <div className="w-64">
          <Story />
        </div>
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("listitem")).toHaveLength(6);
    await expect(canvas.getByText("Drawing now")).toBeVisible();
  },
};

export const HostRow: Story = {
  args: { players: playersFixture, youId: null, layout: "row" },
  decorators: [
    (Story) => (
      <div className="@container/room w-[60rem]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("(you)")).toBeNull();
    await expect(canvas.getByRole("button", { name: /Spotlight Tess/ })).toBeVisible();
  },
};
