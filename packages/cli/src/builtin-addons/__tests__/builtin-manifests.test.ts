import { describe, expect, it } from "vitest"

import { scanBuiltinAddons } from "@/cli/commands/addon-registry"
import { BUILTIN_MANIFESTS } from "../register-builtins"

/**
 * The addon bridge reaches a builtin's handlers through `BUILTIN_MANIFESTS`
 * rather than by importing its entry file, because importing TypeScript source
 * through a `@/` alias is exactly what a published install cannot do. A builtin
 * missing from this map falls back to that import and, in a real install, ends
 * up with buttons that render but never receive data — metrics stuck at "—%",
 * the weather at "---", the media player blank. Nothing fails loudly, so the
 * map has to be checked against the addons that actually ship.
 */
describe("BUILTIN_MANIFESTS", () => {
  // `test-buildin` is a fixture directory used by the scanner's own tests; it
  // is deliberately not registered, so it is not expected in the map.
  const FIXTURES = new Set(["test-buildin"])

  it("covers every builtin the scanner finds with button types", async () => {
    const scanned = await scanBuiltinAddons()
    const withButtons = scanned
      .filter((addon) => addon.types.length > 0 && !FIXTURES.has(addon.name))
      .map((addon) => addon.name)

    expect(withButtons.length).toBeGreaterThan(0)
    const missing = withButtons.filter((name) => !BUILTIN_MANIFESTS.has(name))
    expect(missing).toEqual([])
  })

  it("maps each name to a manifest object, not a path", () => {
    for (const [name, manifest] of BUILTIN_MANIFESTS) {
      expect(typeof manifest, `${name} should be an object`).toBe("object")
      expect(manifest).not.toBeNull()
    }
  })

  it("exposes the addons whose data went missing in a published install", () => {
    // system-status keeps its globalService in manifest.ts and media in
    // backend.ts; both lost their backend entirely when the import failed.
    expect(BUILTIN_MANIFESTS.has("system-status")).toBe(true)
    expect(BUILTIN_MANIFESTS.has("media")).toBe(true)
    expect(BUILTIN_MANIFESTS.has("weather")).toBe(true)
  })
})
