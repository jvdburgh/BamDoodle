import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomProgress } from "./RoomProgress.component";
import { RoomWordCard } from "./RoomWordCard.component";

const meta = {
  title: "Room/RoomProgress",
  component: RoomProgress,
  decorators: [
    (Story) => (
      <div className="w-[24rem]">
        <Story />
      </div>
    ),
  ],
  args: {
    roundNumber: 2,
    rounds: 5,
    turn: 1,
    turnsPerPlayer: 3,
    phase: "drawing",
    turnTitle: "Noor’s turn",
    msLeft: 11_200,
    msTotal: 15_000,
    secret: <RoomWordCard inline category="Animals" word="Giraffe" view="artist" />,
  },
} satisfies Meta<typeof RoomProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The word on top; whose turn, its seconds and which word of how many under it. Never "Round" next to "Turn". */
export const Drawing: Story = {
  play: async ({ canvas }) => {
    const progress = canvas.getByRole("status", { name: "Round progress" });
    await expect(progress).toHaveTextContent("Giraffe");
    await expect(progress).toHaveTextContent("Noor’s turn (1 of 3 each)");
    await expect(progress).toHaveTextContent("12s");
    await expect(progress).toHaveTextContent("Word 2 of 5");
    await expect(progress).not.toHaveTextContent(/Round/);
  },
};

/** The bamboozler's banner is the same size as everyone else's. */
export const Bamboozler: Story = {
  args: { secret: <RoomWordCard inline category="Animals" word={null} view="bamboozler" /> },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("???")).toBeVisible();
    await expect(canvas.getByText("You’re the bamboozler")).toBeVisible();
  },
};

/** One stroke each: after lifting the pen, it says the turn is passing on. */
export const LineDone: Story = {
  args: { turnTitle: "Your turn: one line!", note: "Line done, passing on…" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Line done, passing on…")).toBeVisible();
    await expect(canvas.queryByText(/each\)/)).toBeNull();
  },
};

export const FinalVote: Story = {
  args: { phase: "voting", msLeft: 24_000, msTotal: 30_000 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Final vote")).toBeVisible();
    await expect(canvas.getByText("0:24")).toBeVisible();
    await expect(canvas.queryByText(/each\)/)).toBeNull();
  },
};
