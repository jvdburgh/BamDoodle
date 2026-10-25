import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";
import { wordCategoriesFixture } from "@/components/lobby/_fixtures/wordCategories.fixture";
import { LobbyCategoryPicker } from "./LobbyCategoryPicker.component";

const dutch = wordCategoriesFixture.filter((category) => category.language === "nl");

const meta = {
  title: "Lobby/LobbyCategoryPicker",
  component: LobbyCategoryPicker,
  decorators: [
    (Story) => (
      <div className="w-[26rem] rounded-2xl bg-night-soft/50 p-4">
        <Story />
      </div>
    ),
  ],
  args: { categories: dutch, selected: ["Dieren", "Eten"], onChange: fn() },
  render: function Render(args) {
    const [selected, setSelected] = useState(args.selected);
    return (
      <LobbyCategoryPicker
        {...args}
        selected={selected}
        onChange={(names) => {
          setSelected(names);
          args.onChange(names);
        }}
      />
    );
  },
} satisfies Meta<typeof LobbyCategoryPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PickAndClear: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("checkbox", { name: "Dieren" })).toBeChecked();
    const group = canvas.getByRole("group", { name: /Categories/ });
    await expect(group).toHaveAccessibleName(`Categories (2 of ${dutch.length} selected)`);
    // Picked or not shows in the drawn frame, on the same chip background.
    const frameOpacity = (name: string) =>
      Number(
        getComputedStyle(canvas.getByRole("checkbox", { name }).closest("label")!.querySelector(".sketchy")!).opacity,
      );
    await expect(frameOpacity("Dieren")).toBe(1);
    await expect(frameOpacity("Efteling")).toBe(0);
    await expect(canvas.getByRole("checkbox", { name: "Na middernacht (18+)" })).not.toBeChecked();

    await userEvent.click(canvas.getByText("Efteling"));
    await expect(args.onChange).toHaveBeenLastCalledWith(["Dieren", "Eten", "Efteling"]);
    await expect(group).toHaveAccessibleName(`Categories (3 of ${dutch.length} selected)`);

    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(canvas.getByText("Pick at least one category.")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Select all" }));
    await expect(canvas.getByRole("checkbox", { name: /Lekker Nederlands/ })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: /Lichamelijk/ })).not.toBeChecked();
  },
};

/** Under their word pack's name, each group with its own select-all or clear; no scroll box, the page scrolls. */
export const Groups: Story = {
  play: async ({ args, canvas, userEvent }) => {
    for (const name of ["Everyday", "Dutch", "Logos", "18+"]) {
      await expect(canvas.getByRole("group", { name })).toBeVisible();
    }
    const dutch = within(canvas.getByRole("group", { name: "Dutch" }));
    await expect(dutch.getAllByRole("checkbox").map((box) => box.getAttribute("aria-label"))).toEqual([
      "Efteling",
      "Lekker Nederlands",
      "Sinterklaas",
      "Typisch Nederlands",
    ]);

    await userEvent.click(canvas.getByRole("button", { name: "Select all Dutch" }));
    await expect(args.onChange).toHaveBeenLastCalledWith([
      "Dieren",
      "Eten",
      "Efteling",
      "Lekker Nederlands",
      "Sinterklaas",
      "Typisch Nederlands",
    ]);
    await userEvent.click(canvas.getByRole("button", { name: "Clear Dutch" }));
    await expect(args.onChange).toHaveBeenLastCalledWith(["Dieren", "Eten"]);

    // 18+ is only ever picked on purpose, with the group's own button too.
    await userEvent.click(canvas.getByRole("button", { name: "Select all 18+" }));
    await expect(canvas.getByRole("checkbox", { name: "Na middernacht (18+)" })).toBeChecked();

    const list = canvas.getByRole("group", { name: "Everyday" }).parentElement!;
    await expect(getComputedStyle(list).overflowY).toBe("visible");
  },
};
