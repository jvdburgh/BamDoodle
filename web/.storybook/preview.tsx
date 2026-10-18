import type { Preview } from "@storybook/react-vite";
import { BrandSketchFilter } from "../src/components/brand/BrandSketchFilter.component";
import "../src/index.css";

const preview: Preview = {
  // Components that focus something when they mount need the story's document to have focus; in headless Firefox the
  // test frame often doesn't, so `.focus()` silently does nothing there.
  beforeEach: () => {
    window.focus();
  },
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    a11y: { test: "error" },
  },
  decorators: [
    // Stories that render the filter themselves set `parameters.sketchFilter: false` to avoid a duplicate id.
    (Story, { parameters }) =>
      parameters.sketchFilter === false ? (
        <Story />
      ) : (
        <>
          <BrandSketchFilter />
          <Story />
        </>
      ),
  ],
};

export default preview;
