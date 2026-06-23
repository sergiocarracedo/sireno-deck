import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./packages/cli/src", import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: [
      "packages/cli/src/**/*.test.{ts,tsx}",
      "packages/cli/frontend/src/**/*.test.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      include: ["packages/cli/src/**/*.ts"],
      exclude: ["packages/cli/src/**/*.test.ts", "packages/cli/src/**/__tests__/**"],
    },
  },
});
