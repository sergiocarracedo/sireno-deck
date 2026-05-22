import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "sireno-deck-cli": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "../../builtin-addons/**/*.test.ts"],
  },
})
