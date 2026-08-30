/** @vitest-environment node */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { buildResolverOptions, buildDeckConfigMessage } from "../deck-config"
import {
  registerDeckIcon,
  registerIconForDeck,
  getAssetByPath,
  clearAssets,
} from "@/core/icon-asset-registry"

describe("chrome button icon resolution (user config)", () => {
  it("resolves ./assets/chrome.svg on the main deck chrome button to asset://<id>", () => {
    clearAssets()
    // ponytail: the config dir must exist on disk — icon registration
    // statSync's the resolved path, so a fabricated dir would be skipped.
    const configDir = mkdtempSync(join(tmpdir(), "chrome-icon-test-"))
    mkdirSync(join(configDir, "assets"))
    writeFileSync(join(configDir, "assets", "chrome.svg"), "<svg/>")
    const resolverOptions = buildResolverOptions(
      new Map(),
      [configDir],
      new Map(),
    )
    const deck = {
      id: "main",
      name: "Main",
      isMain: true,
      icon: undefined as string | undefined,
      buttons: [
        {
          id: "10",
          type: "core:action",
          config: { icon: "./assets/chrome.svg", label: "Chrome" },
          actions: { tap: "google-chrome" },
        },
      ],
    }
    registerDeckIcon(deck, resolverOptions)
    registerIconForDeck(deck.buttons, resolverOptions)
    const asset = getAssetByPath(`${configDir}/assets/chrome.svg`)
    expect(asset).toBeDefined()
    const msg = buildDeckConfigMessage(
      deck,
      new Map(),
      resolverOptions,
      { navStackDepth: 1, hasOverlayDeckAvailable: false },
      15,
      false,
      (fullPath) => getAssetByPath(fullPath)?.id,
    )
    const btn = msg.surfaces["main"]?.buttons.find((b) => b.id === "10")
    expect(btn?.config?.icon).toBe(`asset://${asset?.id}`)
  })
})
