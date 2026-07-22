/** @vitest-environment node */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  clearAssets,
  getAssetByPath,
  registerDeckIcon,
} from "@/core/icon-asset-registry"
import { buildResolverOptions } from "@/deck/deck-config"
import type { RuntimeDeck } from "@/deck"

describe("addon:// icon resolution", () => {
  it("resolves addon://<name>/assets/foo.svg using the external addon dir", () => {
    clearAssets()
    const dir = mkdtempSync(join(tmpdir(), "chrome-overlay-icon-"))
    try {
      const assetsDir = join(dir, "assets")
      mkdirSync(assetsDir, { recursive: true })
      writeFileSync(join(assetsDir, "chrome.svg"), "<svg/>")
      const resolverOptions = buildResolverOptions(
        new Map(),
        [],
        new Map([["chrome-overlay", dir]]),
      )
      const deck: RuntimeDeck = {
        id: "chrome-overlay:shortcuts",
        name: "Chrome",
        isMain: false,
        isOverlay: true,
        paginated: true,
        autoShow: true,
        buttonColor: "blue",
        icon: "addon://chrome-overlay/assets/chrome.svg",
        buttons: [],
      }
      registerDeckIcon(deck, resolverOptions)
      const asset = getAssetByPath(join(assetsDir, "chrome.svg"))
      expect(asset).toBeDefined()
      expect(asset?.src.startsWith("data:image/svg+xml;base64,")).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("logs a warning and skips when the addon dir is not registered", () => {
    clearAssets()
    const resolverOptions = buildResolverOptions(new Map(), [], new Map())
    const deck: RuntimeDeck = {
      id: "chrome-overlay:shortcuts",
      name: "Chrome",
      isMain: false,
      isOverlay: true,
      paginated: true,
      autoShow: true,
      buttonColor: "blue",
      icon: "addon://chrome-overlay/assets/chrome.svg",
      buttons: [],
    }
    expect(() => registerDeckIcon(deck, resolverOptions)).not.toThrow()
    expect(
      getAssetByPath(
        "/works/opensource/sireno-deck-addons/chrome-overlay/assets/chrome.svg",
      ),
    ).toBeUndefined()
  })
})
