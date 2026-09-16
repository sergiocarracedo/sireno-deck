import { describe, expect, it } from "vitest"

import { AddonRegistry } from "@/addon/registry"
import { addonSpecFromScanned, buildExternalScannedAddons } from "../run"
import type { ScannedAddon } from "../addon-registry"

// ponytail: regression guard for the bug that made every addon button dead.
// run.ts fed ONE entry-path map to both the daemon and the browser, set to
// `browserEntryPath ?? entryPath`. The daemon then `import()`ed the browser
// bundle, whose `@sirenodeck/sirenodeck/ui/*` specifiers are deliberately left
// external and which plain Node cannot resolve. The import threw into a silent
// catch, no handler was registered, and taps did nothing.
//
// The loader already pins this invariant at its own layer
// (addon/__tests__/loader.test.ts) — run.ts discarded it, and nothing covered
// that until now.

const NODE_ENTRY = "/pkg/addon-pomodoro/dist/index.js"
const BROWSER_ENTRY = "/pkg/addon-pomodoro/dist/frontend.js"

const registryWith = (name: string): AddonRegistry => {
  const registry = new AddonRegistry()
  registry.load({
    apiVersion: 1,
    name,
    buttonTypes: {
      [`${name}:${name}`]: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        frontend: (() => null) as any,
        service: {},
      },
    },
    globalService: { pollers: [] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  return registry
}

const build = (): ReadonlyArray<ScannedAddon> =>
  buildExternalScannedAddons(
    registryWith("pomodoro"),
    [],
    new Map([["pomodoro", "/pkg/addon-pomodoro"]]),
    new Map([["pomodoro", NODE_ENTRY]]),
    new Map([["pomodoro", BROWSER_ENTRY]]),
  )

describe("daemon vs browser addon entry points", () => {
  it("gives the daemon the Node entry, never the browser bundle", () => {
    const addon = build()[0]
    expect(addon).toBeDefined()
    // These two are imported by addon-handler-bridge, i.e. by Node.
    expect(addon!.frontendEntry).toBe(NODE_ENTRY)
    expect(addon!.globalServiceEntry).toBe(NODE_ENTRY)
    expect(addon!.frontendEntry).not.toBe(BROWSER_ENTRY)
    expect(addon!.globalServiceEntry).not.toBe(BROWSER_ENTRY)
  })

  it("gives the browser the dedicated bundle when one exists", () => {
    const addon = build()[0]
    expect(addon!.browserEntry).toBe(BROWSER_ENTRY)
    // No <pkg>/src/index.ts on disk here, so the spec keeps the bundle as-is.
    expect(addonSpecFromScanned(addon!).frontend?.main).toBe(BROWSER_ENTRY)
  })

  it("falls back to the single entry for addons with no browser bundle", () => {
    const addons = buildExternalScannedAddons(
      registryWith("app-shortcuts"),
      [],
      new Map([["app-shortcuts", "/pkg/addon-app-shortcuts"]]),
      new Map([["app-shortcuts", NODE_ENTRY]]),
      new Map([["app-shortcuts", NODE_ENTRY]]),
    )
    const addon = addons[0]
    expect(addon!.frontendEntry).toBe(NODE_ENTRY)
    expect(addon!.browserEntry).toBe(NODE_ENTRY)
  })

  it("leaves the browser entry null when no browser map is supplied", () => {
    const addons = buildExternalScannedAddons(
      registryWith("pomodoro"),
      [],
      new Map([["pomodoro", "/pkg/addon-pomodoro"]]),
      new Map([["pomodoro", NODE_ENTRY]]),
    )
    expect(addons[0]!.browserEntry).toBeNull()
    // The browser still renders via the Node entry, as it did before.
    expect(addonSpecFromScanned(addons[0]!).frontend?.main).toBe(NODE_ENTRY)
  })
})
