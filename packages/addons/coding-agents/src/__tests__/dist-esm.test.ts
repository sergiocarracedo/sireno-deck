import { describe, expect, it } from "vitest"

// ponytail: regression for the ESM-compatible bundle the CLI's
// daemon loads via dynamic import(). Catches:
//   - extensionless relative imports (e.g. `from "./manifest"`) that
//     fail with ERR_MODULE_NOT_FOUND on plain Node ESM
//   - missing module entries (e.g. `entry: "dist/index.js"` pointing
//     at a file tsdown didn't emit)
//   - bundling issues that drop runtime exports
// The test runs AFTER `pnpm build` (CI's `pnpm -r build` precedes
// `pnpm test`), so dist/index.js exists.
describe("dist bundle is loadable as ESM", () => {
  it("dynamic-imports dist/index.js and exposes the manifest", async () => {
    // @ts-expect-error — dist/ is built output, not present at typecheck.
    const mod = await import("../../dist/index.js")
    expect(mod).toBeDefined()
    expect(mod.manifest).toBeDefined()
    expect(mod.manifest.apiVersion).toBe(1)
    expect(mod.manifest.name).toBe("coding-agents")
  })
})
