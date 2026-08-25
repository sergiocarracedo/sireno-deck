import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  dts: false,
  clean: true,
  // ponytail: keep React + zod external — they ship as runtime deps of
  // the consumer's host project. Bundling them would duplicate them
  // and risk version drift. The CLI loads the addon via dynamic
  // import() so this list must match what the host already has installed.
  // chokidar, execa, and @opencode-ai/sdk are CLI-side tools the
  // addon's opencode-server spawner uses; the consumer's host project
  // has them as transitive deps of @sirenodeck/cli.
  external: [
    "react",
    "react-dom",
    "zod",
    "chokidar",
    "execa",
    "@opencode-ai/sdk",
  ],
  // ponytail: tsdown defaults to .mjs for ESM output (because platform=node
  // sets `fixedExtension = true`). The previous tsc build produced .js
  // and the addon's sirenodeck.json + package.json exports both point
  // at dist/index.js. Force .js so we don't have to update every
  // consumer (sirenodeck.json, package.json main, exports .).
  outExtensions: () => ({ js: ".js" }),
})
