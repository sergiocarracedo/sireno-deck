import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./packages/cli/src", import.meta.url)),
      "@sireno-deck/cli": resolve(here, "packages/cli/src/index.ts"),
      "sireno-deck/react": resolve(here, "packages/cli/src/api/react/index.ts"),
      "virtual:sireno/token": fileURLToPath(
        new URL("./packages/cli/frontend/src/__mocks__/token.ts", import.meta.url),
      ),
      "virtual:sireno/theme": fileURLToPath(
        new URL("./packages/cli/frontend/src/__mocks__/theme.ts", import.meta.url),
      ),
      "virtual:sireno/themes/manifest": fileURLToPath(
        new URL("./packages/cli/frontend/src/__mocks__/themes-manifest.tsx", import.meta.url),
      ),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: [
      "packages/cli/src/**/__tests__/**/*.test.{ts,tsx}",
      "packages/cli/frontend/src/**/__tests__/**/*.test.{ts,tsx}",
      "packages/cli/emulator/src/**/__tests__/**/*.test.{ts,tsx}",
    ],
    environmentMatchGlobs: [
      ["packages/cli/frontend/**", "jsdom"],
      ["packages/cli/emulator/**", "jsdom"],
    ],
    setupFiles: ["./packages/cli/emulator/src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/cli/src/**/*.ts"],
      exclude: ["packages/cli/src/**/__tests__/**"],
    },
  },
});
