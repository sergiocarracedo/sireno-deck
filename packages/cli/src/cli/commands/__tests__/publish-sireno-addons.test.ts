import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { publishSIRENO_ADDONS } from "../run"
import type { ScannedAddon } from "../addon-registry"

const ENV_KEY = "SIRENO_ADDONS"

const fakeScanned = (
  name: string,
  frontendEntry: string | null,
  types: ReadonlyArray<string> = [],
  buttonTypes: Record<string, string> = {},
): ScannedAddon => ({
  name,
  types,
  frontendEntry,
  publishIntervalMs: null,
  pollerEntry: null,
  buttonTypes: Object.fromEntries(
    Object.entries(buttonTypes).map(([type, exportName]) => [
      type,
      { exportName, internal: false },
    ]),
  ),
  deckTypes: {},
  source: "json",
  globalServiceEntry: null,
  decks: [],
})

describe("publishSIRENO_ADDONS", () => {
  const originalEnv = process.env[ENV_KEY]
  beforeEach(() => {
    delete process.env[ENV_KEY]
  })
  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[ENV_KEY]
    } else {
      process.env[ENV_KEY] = originalEnv
    }
  })

  it("includes external addons in the env so the frontend can render them", () => {
    const builtin = fakeScanned(
      "core",
      "/path/to/core/index.ts",
      ["core:action"],
      { "core:action": "default" },
    )
    const external = fakeScanned(
      "pomodoro",
      "/path/to/addon-pomodoro/dist/index.js",
      ["pomodoro:pomodoro"],
      { "pomodoro:pomodoro": "default" },
    )

    publishSIRENO_ADDONS([builtin], [external])

    const parsed = JSON.parse(process.env[ENV_KEY] ?? "[]") as Array<{
      name: string
      frontend?: { main: string }
      buttonTypes?: Record<string, string>
    }>
    const pomodoro = parsed.find((s) => s.name === "pomodoro")
    expect(pomodoro).toBeDefined()
    expect(pomodoro?.frontend?.main).toBe(
      "/path/to/addon-pomodoro/dist/index.js",
    )
    expect(pomodoro?.buttonTypes?.["pomodoro:pomodoro"]).toBe("default")
  })

  it("preserves builtin-only behavior when no external addons are present", () => {
    const builtin = fakeScanned(
      "core",
      "/path/to/core/index.ts",
      ["core:action"],
      { "core:action": "default" },
    )

    publishSIRENO_ADDONS([builtin], [])

    const parsed = JSON.parse(process.env[ENV_KEY] ?? "[]") as Array<{
      name: string
    }>
    expect(parsed.map((s) => s.name)).toEqual(["core"])
  })

  it("is a no-op when SIRENO_ADDONS is already set (rebuild guard)", () => {
    process.env[ENV_KEY] = JSON.stringify([{ name: "preset" }])
    const external = fakeScanned(
      "pomodoro",
      "/path/to/addon-pomodoro/dist/index.js",
      ["pomodoro:pomodoro"],
      { "pomodoro:pomodoro": "default" },
    )

    publishSIRENO_ADDONS([], [external])

    expect(process.env[ENV_KEY]).toBe(JSON.stringify([{ name: "preset" }]))
  })
})
