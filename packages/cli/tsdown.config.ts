import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/cli/main.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  platform: "node",
  dts: false,
  clean: true,
  // ponytail: native addons (sharp, @elgato-stream-deck/node, dbus-next,
  // get-windows, usocket, @julusian/jpeg-turbo) ship prebuilt .node binaries
  // — a JS bundle cannot embed them. Same for playwright/playwright-core/vite,
  // which are large and have side-effecting postinstall scripts.
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
})
