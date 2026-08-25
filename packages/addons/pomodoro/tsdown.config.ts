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
  external: ["react", "react-dom", "zod"],
  // ponytail: tsdown defaults to .mjs for ESM output (because platform=node
  // sets `fixedExtension = true`). The previous tsc build produced .js
  // and the addon's sirenodeck.json + package.json exports both point
  // at dist/index.js. Force .js so we don't have to update every
  // consumer (sirenodeck.json, package.json main, exports .).
  outExtensions: () => ({ js: ".js" }),
  // ponytail: the addon's frontend.tsx imports `@/ui/primitives/Label`
  // as a host-relative alias that only the CLI's vite resolves. The
  // daemon loads the addon's bundle via plain Node `import()` and
  // has no such alias. Redirect to a no-op stub for the daemon path;
  // the CLI's vite overrides this when serving the frontend SPA.
  alias: {
    "@/ui/primitives/Label": new URL("./src/stubs/label.ts", import.meta.url)
      .pathname,
  },
})
