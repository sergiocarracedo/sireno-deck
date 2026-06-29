import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./packages/cli/src", import.meta.url)),
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
    ],
    coverage: {
      provider: "v8",
      include: ["packages/cli/src/**/*.ts"],
      exclude: ["packages/cli/src/**/__tests__/**"],
    },
  },
});
