// ponytail: explicit `.js` extensions on relative imports. TypeScript
// with `moduleResolution: "Bundler"` accepts `.js` to mean the source
// `.ts`/`.tsx` file. At runtime the `.js` suffix is what Node ESM (and
// the browser ESM loader) actually resolve against. Extensionless
// imports work in `tsc` + `tsx` because tsx has its own loader, but
// tsdown bundles to a single static file where the bundler can't
// resolve extensionless paths at build time — it falls back to a
// `createRequire` shim from `node:module`, which the browser
// externalizes and breaks. Source-level `.js` lets the bundler
// resolve at build time → no shim → browser-safe.
import type { AddonManifestV1 } from "./types.js"

export { manifest } from "./manifest.js"
