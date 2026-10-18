/// <reference types="vitest/config" />
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const serverUrl = process.env.BAMDOODLE_SERVER_URL ?? "http://localhost:8080";

// Which commit a development build is (nearest tag plus commits, or the bare hash), for the footer; release builds
// show their tag instead (VITE_BAMDOODLE_VERSION).
try {
  process.env.VITE_BAMDOODLE_COMMIT ??= execSync("git describe --tags --always --dirty", { stdio: "pipe" })
    .toString()
    .trim();
} catch {
  // No git here (a container build): the footer says "Development build" alone.
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.join(dirname, "src") },
  },
  server: {
    proxy: {
      "/api": serverUrl,
      "/ws": { target: serverUrl.replace(/^http/, "ws"), ws: true },
    },
  },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "firefox" }, { browser: "chromium" }],
          },
        },
      },
    ],
  },
});
