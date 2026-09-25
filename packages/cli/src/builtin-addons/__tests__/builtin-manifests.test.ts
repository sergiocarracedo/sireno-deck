import { describe, expect, it } from "vitest"

import { scanBuiltinAddons } from "@/cli/commands/addon-registry"
import { BUILTIN_GLOBAL_SERVICES } from "../global-services"
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

/**
 * A builtin's global service is what produces its data. The bridge takes it
 * from a static map, falling back to importing `globalServiceEntry` — a
 * fallback that cannot work in a published install, where that entry is
 * TypeScript source. So every builtin that declares a global service has to be
 * reachable statically: either the manifest carries it, or this map does.
 *
 * `coding-agents` is the case that proves it. Its manifest mentions
 * `globalService` only in a comment — the service itself lives in
 * `global-entry.ts`, kept out of the browser graph on purpose. Taking the
 * manifest as the answer left the agents deck and summary button empty and
 * froze the persisted snapshot.
 */
describe("BUILTIN_GLOBAL_SERVICES", () => {
  it("covers every builtin whose service is not on its manifest", async () => {
    const scanned = await scanBuiltinAddons()
    const unreachable = scanned
      .filter((addon) => addon.globalServiceEntry !== null)
      .filter((addon) => {
        if (BUILTIN_GLOBAL_SERVICES.has(addon.name)) return false
        const manifest = BUILTIN_MANIFESTS.get(addon.name) as
          | { globalService?: unknown }
          | undefined
        return manifest?.globalService === undefined
      })
      .map((addon) => addon.name)

    expect(unreachable).toEqual([])
  })

  it("hands over coding-agents' service as an object", () => {
    const service = BUILTIN_GLOBAL_SERVICES.get("coding-agents")
    expect(service).toBeDefined()
    expect(typeof service).toBe("object")
  })
})
