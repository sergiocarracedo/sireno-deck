import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // ponytail: stub host-only modules so the manifest test can load
    // addon frontends without dragging in the full host tree.
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
