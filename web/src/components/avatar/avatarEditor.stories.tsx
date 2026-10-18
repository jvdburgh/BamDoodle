import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { AvatarEditor } from "./AvatarEditor.component";
import type { AvatarStroke } from "./_types/avatar.types";
import { AvatarUtils } from "./_utils/avatar.utils";

const start = AvatarUtils.face(7);

const meta = {
  title: "Avatar/AvatarEditor",
  component: AvatarEditor,
  args: { value: start, onChange: fn() },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <div className="w-80">
        <AvatarEditor
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange(next);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof AvatarEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

function drawLine(pad: Element) {
  const box = pad.getBoundingClientRect();
  const at = (x: number, y: number): PointerEventInit => ({
    clientX: box.left + x * box.width,
    clientY: box.top + y * box.height,
    pointerId: 5,
    pointerType: "mouse",
    pressure: 0.5,
    button: 0,
    buttons: 1,
    bubbles: true,
  });
  pad.dispatchEvent(new PointerEvent("pointerdown", at(0.3, 0.3)));
  for (let i = 1; i <= 8; i++) pad.dispatchEvent(new PointerEvent("pointermove", at(0.3 + i * 0.05, 0.3 + i * 0.02)));
  pad.dispatchEvent(new PointerEvent("pointerup", at(0.7, 0.46)));
}

const lastChange = (onChange: unknown) =>
  ((onChange as ReturnType<typeof fn>).mock.calls.at(-1)?.[0] ?? []) as AvatarStroke[];

export const DrawOnTheFace: Story = {
  play: async ({ args, canvas }) => {
    drawLine(canvas.getByRole("img", { name: "Avatar drawing pad" }));
    const strokes = lastChange(args.onChange);
    await expect(strokes).toHaveLength(start.length + 1);
    const line = strokes.at(-1);
    await expect(line).toMatchObject({ color: AvatarUtils.white, size: AvatarUtils.brushSize, hasPressure: false });
    await expect(line?.points[0]).toEqual([0.3, 0.3, 0.5]);
    await expect(line?.points.at(-1)).toEqual([0.7, 0.46, 0.5]);
  },
};

export const PickAColour: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Berry" }));
    drawLine(canvas.getByRole("img", { name: "Avatar drawing pad" }));
    await expect(lastChange(args.onChange).at(-1)?.color).toBe("#f13866");
  },
};

export const UndoAndClear: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const undo = canvas.getByRole("button", { name: "Undo" });
    const clear = canvas.getByRole("button", { name: "Clear" });
    await expect(undo).toHaveAttribute("aria-disabled", "true");

    drawLine(canvas.getByRole("img", { name: "Avatar drawing pad" }));
    await waitFor(() => expect(undo).toHaveAttribute("aria-disabled", "false"));
    await userEvent.click(undo);
    await expect(lastChange(args.onChange)).toEqual(start);

    await userEvent.click(clear);
    await expect(lastChange(args.onChange)).toEqual([]);
    await expect(clear).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(clear);
    await expect(args.onChange).toHaveBeenCalledTimes(3);

    await userEvent.click(undo);
    await expect(lastChange(args.onChange)).toEqual(start);
  },
};

export const ShuffleWithTheKeyboard: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const shuffle = canvas.getByRole("button", { name: "Shuffle" });
    shuffle.focus();
    await userEvent.keyboard("{Enter}");
    const shuffled = lastChange(args.onChange);
    await expect(shuffled).not.toEqual(start);
    await expect(shuffled.every((stroke) => stroke.color === AvatarUtils.white)).toBe(true);

    await userEvent.click(canvas.getByRole("button", { name: "Undo" }));
    await expect(lastChange(args.onChange)).toEqual(start);
  },
};

export const BlankStart: Story = {
  args: { value: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Clear" })).toHaveAttribute("aria-disabled", "true");
  },
};

export const FullFace: Story = {
  args: {
    value: Array.from({ length: AvatarUtils.limits.strokes }, (_, i) => start[i % start.length] as AvatarStroke),
  },
  play: async ({ args, canvas }) => {
    drawLine(canvas.getByRole("img", { name: "Avatar drawing pad" }));
    await expect(await canvas.findByText("Your face is full: undo or clear to draw more.")).toBeVisible();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};
