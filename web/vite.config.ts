/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const serverUrl = process.env.BAMDOODLE_SERVER_URL ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.join(dirname, "src") },
  },
  server: {
    // Reachable from phones on the same Wi-Fi, for trying the phone view on a real phone.
    host: true,
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
