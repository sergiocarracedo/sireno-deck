import { defineConfig } from "tsdown"

const nodeBundle = defineConfig({
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
  // public `@sirenodeck/sirenodeck/ui/*` specifier. In the browser, vite's host
  // alias resolves it to the real component. Plain Node (the daemon
  // importing this bundle for manifest/globalService) has no such
  // resolution, so redirect to an inert stub — nothing renders in Node,
  // so the swap is invisible there.
  alias: {
    "@sirenodeck/sirenodeck/ui/primitives/Label": new URL(
      "./src/stubs/label.ts",
      import.meta.url,
    ).pathname,
  },
})

// ponytail: a SECOND bundle, for the browser only.
//
// The Node bundle above aliases `@sirenodeck/sirenodeck/ui/primitives/Label`
// to an inert stub, because plain Node (the daemon, importing this package to
// read its manifest) cannot resolve the host's .tsx sources. The original
// comment assumed vite would "ignore this stub" when rendering the frontend —
// it cannot: tsdown inlines the stub at build time, so the specifier never
// survives into dist/index.js and the browser rendered `Label = () => null`.
// That is why every pomodoro button drew its icon but no text.
//
// Here the specifier is left EXTERNAL instead, so the host's vite alias
// resolves it to the real component in the browser. sirenodeck.json points
// `frontendEntry` at this file; the daemon keeps loading dist/index.js.
const browserBundle = defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "neutral",
  outDir: "dist",
  dts: false,
  // Must not clean — it would wipe the Node bundle built by the first config.
  clean: false,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "zod",
    // Resolved by the host's vite alias at runtime.
    /^@sirenodeck\/sirenodeck\//,
  ],
  outExtensions: () => ({ js: ".js" }),
  outputOptions: { entryFileNames: "frontend.js" },
})

export default [nodeBundle, browserBundle]
