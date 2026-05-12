import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["./src/cli/index.ts"],
  format: "esm",
  target: "node20",
  clean: true,
  dts: true,
  bundle: false,
})
