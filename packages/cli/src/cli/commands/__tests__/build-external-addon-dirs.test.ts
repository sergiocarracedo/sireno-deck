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
          src: "/works/opensource/sirenodeck-addons/chrome-overlay",
          config: { decks: { shortcuts: { autoShow: false } } },
        },
      ],
      "/works/opensource/sirenodeck-2/config.yml",
    )
    expect(dirs.get("chrome-overlay")).toBe(
      "/works/opensource/sirenodeck-addons/chrome-overlay",
    )
  })

  it("registers string-form entries directly", () => {
    const dirs = buildExternalAddonDirs(
      ["/works/opensource/sirenodeck-addons/opencode-overlay"],
      "/works/opensource/sirenodeck-2/config.yml",
    )
    expect(dirs.get("opencode-overlay")).toBe(
      "/works/opensource/sirenodeck-addons/opencode-overlay",
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
      "/works/opensource/sirenodeck-2/config.yml",
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

  // ponytail: npm-specifier addons. The config-entry path only ever produced
  // a plausible key for LOCAL paths — `@sirenodeck/addon-app-shortcuts` was
  // resolved against the config dir into a directory that does not exist and
  // keyed on "addon-app-shortcuts", while the addon's own icons reference
  // `addon://app-shortcuts/...`. Every npm addon's icons failed to resolve.
  it("keys npm-specifier addons by manifest name, from the resolved entry", () => {
    const dirs = buildExternalAddonDirs(
      [{ src: "@sirenodeck/addon-app-shortcuts" }],
      "/home/u/.config/sirenodeck/config.yml",
      new Map([
        [
          "app-shortcuts",
          "/home/u/.config/sirenodeck/node_modules/@sirenodeck/addon-app-shortcuts/dist/index.js",
        ],
      ]),
    )
    expect(dirs.get("app-shortcuts")).toBe(
      "/home/u/.config/sirenodeck/node_modules/@sirenodeck/addon-app-shortcuts/dist",
    )
  })

  it("prefers the resolved entry dir over the config-entry guess", () => {
    const dirs = buildExternalAddonDirs(
      [{ src: "/p/chrome-overlay" }],
      "/anywhere/config.yml",
      new Map([["chrome-overlay", "/real/chrome-overlay/dist/index.js"]]),
    )
    expect(dirs.get("chrome-overlay")).toBe("/real/chrome-overlay/dist")
  })

  it("still registers config entries that did not resolve", () => {
    const dirs = buildExternalAddonDirs(
      [{ src: "/p/chrome-overlay" }, { src: "/p/other-addon" }],
      "/anywhere/config.yml",
      new Map([["chrome-overlay", "/real/chrome-overlay/dist/index.js"]]),
    )
    expect(dirs.get("chrome-overlay")).toBe("/real/chrome-overlay/dist")
    expect(dirs.get("other-addon")).toBe("/p/other-addon")
  })
})
