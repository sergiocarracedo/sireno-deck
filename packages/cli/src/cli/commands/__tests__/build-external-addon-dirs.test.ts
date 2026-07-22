import { describe, expect, it } from "vitest"

import { buildExternalAddonDirs } from "../run"

describe("buildExternalAddonDirs", () => {
  it("registers object-form entries by their `src:` field", () => {
    // ponytail: this is the bug — run.ts previously read `entry.source` (a
    // field that never existed; the schema uses `src:`). The map ended up
    // empty, so `addonDirs.get("chrome-overlay")` returned undefined and
    // every `addon://chrome-overlay/...` icon in the deck fell through to
    // the "skipping unresolvable icon" warn path.
    const dirs = buildExternalAddonDirs(
      [
        {
          src: "/works/opensource/sireno-deck-addons/chrome-overlay",
          config: { decks: { shortcuts: { autoShow: false } } },
        },
      ],
      "/works/opensource/sireno-deck-2/config.yml",
    )
    expect(dirs.get("chrome-overlay")).toBe(
      "/works/opensource/sireno-deck-addons/chrome-overlay",
    )
  })

  it("registers string-form entries directly", () => {
    const dirs = buildExternalAddonDirs(
      ["/works/opensource/sireno-deck-addons/opencode-overlay"],
      "/works/opensource/sireno-deck-2/config.yml",
    )
    expect(dirs.get("opencode-overlay")).toBe(
      "/works/opensource/sireno-deck-addons/opencode-overlay",
    )
  })

  it("expands ~/ against the user's home directory", () => {
    const dirs = buildExternalAddonDirs(
      ["~/addons/my-overlay"],
      "/anywhere/config.yml",
    )
    expect(dirs.get("my-overlay")).toMatch(/\/addons\/my-overlay$/)
  })

  it("resolves relative paths against the config directory", () => {
    const dirs = buildExternalAddonDirs(
      ["../local-addons/foo-overlay"],
      "/works/opensource/sireno-deck-2/config.yml",
    )
    expect(dirs.get("foo-overlay")).toBe(
      "/works/opensource/local-addons/foo-overlay",
    )
  })

  it("ignores entries with neither a string nor a `src:` field", () => {
    const dirs = buildExternalAddonDirs(
      [{ enabled: false }, null, 42],
      "/anywhere/config.yml",
    )
    expect(dirs.size).toBe(0)
  })

  it("keys collisions on basename — last entry wins", () => {
    const dirs = buildExternalAddonDirs(
      [{ src: "/p/chrome-overlay" }, { src: "/q/chrome-overlay" }],
      "/anywhere/config.yml",
    )
    expect(dirs.get("chrome-overlay")).toBe("/q/chrome-overlay")
  })
})
