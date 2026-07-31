import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // ponytail: stub the host's Label so the addon's manifest test can
    // import `../manifest` (which transitively pulls frontend.tsx)
    // without dragging in the host's React tree.
    alias: {
      "@/ui/primitives/Label": new URL(
        "./src/__tests__/__stubs__/label.tsx",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    environment: "node",
  },
})
