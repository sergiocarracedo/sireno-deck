import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    cli: "./src/cli/index.ts",
    index: "./src/index.ts",
    "render/jsx": "./src/render/jsx.ts",
  },
  format: "esm",
  target: "node20",
  clean: true,
  dts: true,
  unbundle: true,
  fixedExtension: false,
})
