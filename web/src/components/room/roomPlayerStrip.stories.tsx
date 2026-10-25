import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";
import { RoomPlayerStrip } from "./RoomPlayerStrip.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomPlayerStrip",
  component: RoomPlayerStrip,
  decorators: [
    (Story) => (
      <div className="w-[24rem] p-3">
        <Story />
      </div>
    ),
  ],
  args: {
    players: playersFixture,
    youId: 2,
    activeId: 3,
    totals: { 1: 2, 2: 1, 3: 0, 4: 3, 5: 1, 6: 0 },
    spotlightId: null,
    onSpotlight: fn(),
    onSuspect: fn(),
    suspicion: null,
  },
  render: function Render(args) {
    const [spotlightId, setSpotlightId] = useState(args.spotlightId);
    const [suspicion, setSuspicion] = useState(args.suspicion);
    return (
      <RoomPlayerStrip
        {...args}
        spotlightId={spotlightId}
        onSpotlight={(id) => {
          setSpotlightId(id);
          args.onSpotlight(id);
        }}
        suspicion={suspicion}
        onSuspect={
          args.onSuspect &&
          ((id) => {
            setSuspicion(id);
            args.onSuspect?.(id);
          })
        }
      />
    );
  },
} satisfies Meta<typeof RoomPlayerStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Everyone in one row with their score; a tap opens what you can do with them. */
export const WhileDrawing: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const players = canvas.getByRole("list", { name: "Players" });
    await expect(within(players).getAllByRole("button")).toHaveLength(6);
    await expect(canvas.getByRole("button", { name: /^Kiki\b.*3 points$/ })).toBeVisible();
    const mo = canvas.getByRole("button", { name: /^Mo\b.*0 points, drawing now$/ });
    await userEvent.click(mo);
    await expect(mo).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(canvas.getByRole("button", { name: "See their lines" }));
    await expect(args.onSpotlight).toHaveBeenCalledWith(3);
    await expect(canvas.getByRole("button", { name: "See their lines" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(canvas.getByRole("button", { name: "Mark as suspicious" }));
    await expect(args.onSuspect).toHaveBeenCalledWith(3);
    await expect(canvas.getByRole("button", { name: "Suspected" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Suspected" }));
    await expect(args.onSuspect).toHaveBeenLastCalledWith(null);

    await userEvent.click(mo);
    await expect(mo).toHaveAttribute("aria-expanded", "false");
  },
};

/** What the table knows: who suspects whom while drawing, who has voted (never for whom) in the vote. */
export const WhoSuspectsAndWhoVoted: Story = {
  args: { suspectedBy: { 3: [2, 4] }, votedIds: [1, 4] },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: /^Pip\b.*voted/ })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: /^Mo\b/ }));
    await expect(canvas.getByText("Suspected by you and Kiki")).toBeVisible();
  },
};

/** You can't suspect yourself, and nobody can suspect before or after the drawing. */
export const YouAndAfterTheDrawing: Story = {
  args: { onSuspect: undefined, activeId: null },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Juno, You/ }));
    await expect(canvas.getByRole("button", { name: "See your lines" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Mark as suspicious" })).toBeNull();
  },
};

/** After the reveal: the hat on the bamboozler, and who voted for whom with the round's points. */
export const AfterTheReveal: Story = {
  args: {
    onSuspect: undefined,
    activeId: null,
    outcome: { bamboozlerId: 4, votes: { 1: 4, 2: 1, 3: 4 }, scores: { 1: { points: 1, right: true } } },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Kiki/ }));
    await expect(canvas.getByText("The bamboozler")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: /Pip/ }));
    await expect(canvas.getByText("Voted Kiki")).toBeVisible();
    await expect(canvas.getByText("+1 this round")).toBeVisible();
  },
};
