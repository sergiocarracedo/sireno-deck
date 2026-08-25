import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/cli/main.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist/cli",
  platform: "node",
  dts: false,
  deps: {
    neverBundle: [
      "sharp",
      "@elgato-stream-deck/node",
      "dbus-next",
      "get-windows",
      "usocket",
      "@julusian/jpeg-turbo",
      "playwright",
      "playwright-core",
      "vite",
    ],
  },
  clean: true,
})
