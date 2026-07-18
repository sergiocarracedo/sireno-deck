import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  clearAssets,
  getAssetByPath,
  getUnsentAssets,
  registerDeckIcon,
  registerIconForDeck,
} from "../icon-asset-registry"

let tmpDir: string

beforeEach(() => {
  clearAssets()
  tmpDir = mkdtempSync(join(tmpdir(), "asset-registry-test-"))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
  clearAssets()
})

describe("registerIconForDeck", () => {
  it("registers an addon:// icon and returns its data URL", () => {
    const filePath = join(tmpDir, "icon.svg")
    writeFileSync(filePath, "<svg/>", "utf8")
    registerIconForDeck(
      [{ config: { icon: "addon://demo/icon.svg" }, id: "0", type: "x" }],
      { addonDirs: new Map([["demo", tmpDir]]) },
    )
    const asset = getAssetByPath(filePath)
    expect(asset).toBeDefined()
    expect(asset?.src).toMatch(/^data:image\/svg\+xml;base64,/)
    expect(asset?.mime).toBe("image/svg+xml")
  })

  it("deduplicates the same path", () => {
    const filePath = join(tmpDir, "icon.svg")
    writeFileSync(filePath, "<svg/>", "utf8")
    registerIconForDeck(
      [
        { config: { icon: "addon://demo/icon.svg" }, id: "0", type: "x" },
        { config: { icon: "addon://demo/icon.svg" }, id: "1", type: "x" },
      ],
      { addonDirs: new Map([["demo", tmpDir]]) },
    )
    const sentIds = new Set<string>()
    expect(getUnsentAssets(sentIds)).toHaveLength(1)
  })

  it("getUnsentAssets diffs against sentIds", () => {
    writeFileSync(join(tmpDir, "a.svg"), "<a/>", "utf8")
    writeFileSync(join(tmpDir, "b.svg"), "<b/>", "utf8")
    registerIconForDeck(
      [
        { config: { icon: "addon://demo/a.svg" }, id: "0", type: "x" },
        { config: { icon: "addon://demo/b.svg" }, id: "1", type: "x" },
      ],
      { addonDirs: new Map([["demo", tmpDir]]) },
    )
    const allIds = new Set<string>()
    for (const a of getUnsentAssets(allIds)) allIds.add(a.id)
    expect(getUnsentAssets(allIds)).toHaveLength(0)
  })

  it("skips buttons without a config.icon", () => {
    registerIconForDeck(
      [{ config: { label: "no icon" }, id: "0", type: "x" }],
      {},
    )
    expect(getUnsentAssets(new Set())).toHaveLength(0)
  })

  it("skips unresolvable icons without throwing", () => {
    expect(() =>
      registerIconForDeck(
        [{ config: { icon: "addon://unknown/x.svg" }, id: "0", type: "x" }],
        { addonDirs: new Map() },
      ),
    ).not.toThrow()
    expect(getUnsentAssets(new Set())).toHaveLength(0)
  })
})

describe("registerDeckIcon", () => {
  it("registers deck.icon from an addon:// URI", () => {
    const filePath = join(tmpDir, "deck.svg")
    writeFileSync(filePath, "<svg/>", "utf8")
    registerDeckIcon(
      { icon: "addon://demo/deck.svg" },
      { addonDirs: new Map([["demo", tmpDir]]) },
    )
    const asset = getAssetByPath(filePath)
    expect(asset).toBeDefined()
    expect(asset?.src).toMatch(/^data:image\/svg\+xml;base64,/)
  })

  it("registers a relative-path deck.icon using baseDirs", () => {
    const filePath = join(tmpDir, "deck.png")
    writeFileSync(filePath, "png", "utf8")
    registerDeckIcon(
      { icon: "./deck.png" },
      { addonDirs: new Map(), baseDirs: [tmpDir] },
    )
    expect(getAssetByPath(filePath)).toBeDefined()
  })

  it("skips when deck.icon is missing or empty", () => {
    expect(() => registerDeckIcon({}, {}, undefined)).not.toThrow()
    expect(() => registerDeckIcon({ icon: "" }, {}, undefined)).not.toThrow()
    expect(getUnsentAssets(new Set())).toHaveLength(0)
  })

  it("leaves icon:// deck icons alone (handled by frontend)", () => {
    expect(() =>
      registerDeckIcon({ icon: "icon://layers" }, {}, undefined),
    ).not.toThrow()
    expect(getUnsentAssets(new Set())).toHaveLength(0)
  })
})
