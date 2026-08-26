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
  // and risk version drift. NOTE: `react/jsx-runtime` must be listed
  // explicitly — rolldown treats subpath specifiers as distinct modules,
  // so `external: ["react"]` alone does NOT cover `react/jsx-runtime`.
  // Without it, rolldown bundles react's CJS build and emits a
  // createRequire shim from node:module, which vite then externalizes
  // in the browser and the frontend crashes.
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "zod",
  ],
  // ponytail: tsdown defaults to .mjs for ESM output (because platform=node
  // sets `fixedExtension = true`). The previous tsc build produced .js
  // and the addon's sirenodeck.json + package.json exports both point
  // at dist/index.js. Force .js so we don't have to update every
  // consumer (sirenodeck.json, package.json main, exports .).
  outExtensions: () => ({ js: ".js" }),
  // ponytail: the addon's frontend.tsx imports the host Label via the
  // public `@sirenodeck/cli/ui/*` specifier. In the browser, vite's host
  // alias resolves it to the real component. Plain Node (the daemon
  // importing this bundle for manifest/globalService) has no such
  // resolution, so redirect to an inert stub — nothing renders in Node,
  // so the swap is invisible there.
  alias: {
    "@sirenodeck/cli/ui/primitives/Label": new URL(
      "./src/stubs/label.ts",
      import.meta.url,
    ).pathname,
  },
})
