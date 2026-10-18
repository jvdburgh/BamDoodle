import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
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
    await expect(canvas.getByRole("checkbox", { name: "Dieren" })).toHaveAccessibleDescription(/\d+ words/);
    await expect(canvas.getByRole("checkbox", { name: "Na middernacht (18+)" })).not.toBeChecked();

    await userEvent.click(canvas.getByText("Efteling"));
    await expect(args.onChange).toHaveBeenLastCalledWith(["Dieren", "Eten", "Efteling"]);

    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(canvas.getByText("Pick at least one category.")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Select all" }));
    await expect(canvas.getByRole("checkbox", { name: /Lekker Nederlands/ })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: /Lichamelijk/ })).not.toBeChecked();
  },
};
