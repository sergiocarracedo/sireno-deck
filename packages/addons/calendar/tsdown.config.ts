import { defineConfig } from "tsdown"

export default [
  defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    platform: "node",
    target: "node20",
    outDir: "dist",
    clean: false,
    dts: false,
    external: ["react", "react/jsx-runtime", "zod"],
    alias: {
      "@sirenodeck/sirenodeck/ui/surfaces/IconLabelSurface": new URL(
        "./src/stubs/icon-label.ts",
        import.meta.url,
      ).pathname,
    },
    outExtensions: () => ({ js: ".js" }),
  }),
  defineConfig({
    entry: ["src/frontend-entry.ts"],
    format: ["esm"],
    platform: "neutral",
    outDir: "dist",
    clean: false,
    dts: false,
    external: ["react", "react/jsx-runtime", /^@sirenodeck\/sirenodeck\//],
    outputOptions: { entryFileNames: "frontend.js" },
  }),
]
