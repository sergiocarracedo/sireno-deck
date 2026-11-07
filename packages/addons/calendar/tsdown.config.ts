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
    outExtensions: () => ({ js: ".js" }),
  }),
  defineConfig({
    entry: ["src/frontend-entry.ts"],
    format: ["esm"],
    platform: "neutral",
    outDir: "dist",
    clean: false,
    dts: false,
    external: ["react", "react/jsx-runtime"],
    outputOptions: { entryFileNames: "frontend.js" },
  }),
]
