import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@sirenodeck/sirenodeck/ui/surfaces/IconLabelSurface": new URL(
        "./src/stubs/icon-label.ts",
        import.meta.url,
      ).pathname,
    },
  },
})
