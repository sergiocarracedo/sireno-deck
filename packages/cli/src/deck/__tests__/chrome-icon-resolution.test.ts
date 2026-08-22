/** @vitest-environment node */
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
    const configDir = "/works/opensource/sireno-deck-2"
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
