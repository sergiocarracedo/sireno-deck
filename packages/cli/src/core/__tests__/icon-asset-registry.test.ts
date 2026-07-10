import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  clearAssets,
  getAssetByPath,
  getUnsentAssets,
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