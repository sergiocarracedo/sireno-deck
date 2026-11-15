import { defineConfig } from "tsdown"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
// Native config loading needs the explicit TypeScript extension.
// eslint-disable-next-line import/extensions
import { fingerprintBuildInputs } from "./src/util/build-fingerprint.ts"

export default defineConfig({
  define: {
    __SIRENO_BUILD_ID__: JSON.stringify(
      fingerprintBuildInputs(dirname(fileURLToPath(import.meta.url))),
    ),
  },
  entry: ["src/cli/main.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  platform: "node",
  dts: false,
  clean: true,
  // ponytail: native addons (sharp, @elgato-stream-deck/node, dbus-next,
  // usocket, @julusian/jpeg-turbo) ship prebuilt .node binaries
  // — a JS bundle cannot embed them. Same for playwright/playwright-core/vite,
  // which are large and have side-effecting postinstall scripts.
  deps: {
    neverBundle: [
      "sharp",
      "@napi-rs/keyring",
      "@elgato-stream-deck/node",
      "dbus-next",
      "usocket",
      "@julusian/jpeg-turbo",
      "playwright",
      "playwright-core",
      "vite",
    ],
  },
})
