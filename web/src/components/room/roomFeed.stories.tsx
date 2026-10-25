import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomFeed } from "./RoomFeed.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomFeed",
  component: RoomFeed,
  args: {
    players: playersFixture,
    lines: [
      { id: 1, at: 0, kind: "suspect", voterId: 1, suspectId: 3, beforeId: null },
      { id: 2, at: 0, kind: "suspect", voterId: 2, suspectId: 1, beforeId: 3 },
      { id: 3, at: 0, kind: "voted", voterId: 5 },
      { id: 4, at: 0, kind: "suspect", voterId: 4, suspectId: null, beforeId: 1 },
    ],
  },
} satisfies Meta<typeof RoomFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The faces drawn in a line; they're decorative, since the words name everyone. */
const faces = (line: HTMLElement) => line.querySelectorAll("svg").length;

export const OnAPhone: Story = {
  args: { youId: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("list", { name: "Table talk" })).toHaveAttribute("aria-live", "polite");
    await expect(canvas.getByText("Pip thinks Mo is sketchy")).toBeInTheDocument();
    await expect(canvas.getByText("You now suspect Pip")).toBeInTheDocument();
    await expect(canvas.getByText("Rafa has voted")).toBeInTheDocument();
  },
};

/** Who's involved shows as their faces: the one who suspects, and the suspect in the hat. */
export const Faces: Story = {
  play: async ({ canvas }) => {
    const [suspects, changes, voted, unsure] = canvas.getAllByRole("listitem");
    await expect(faces(suspects!)).toBe(2);
    await expect(suspects!.querySelectorAll('img[src$="/hat.svg"]')).toHaveLength(1);
    await expect(faces(changes!)).toBe(2);
    await expect(faces(voted!)).toBe(1);
    await expect(faces(unsure!)).toBe(1);
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

export const OnTheHostScreen: Story = {
  args: { big: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Juno now suspects Pip")).toBeInTheDocument();
  },
};
