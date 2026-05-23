import { resolve } from "node:path"

import type {
  AddonButtonDefinition,
  AddonDeckDefinition,
  SirenoAddon,
} from "./api.js"

const ADDON_ASSET_PREFIXES = ["addon://", "builtin://"] as const

function getAssetKey(addonName: string, assetName: string): string {
  return `${addonName}/${assetName}`
}

function parseAssetReference(assetReference: string): { addonName: string; assetName: string } | undefined {
  const matchedPrefix = ADDON_ASSET_PREFIXES.find((prefix) => assetReference.startsWith(prefix))
  if (!matchedPrefix) {
    return undefined
  }

  const [addonName, ...assetNameParts] = assetReference.slice(matchedPrefix.length).split("/")
  if (!addonName || assetNameParts.length === 0) {
    return undefined
  }

  return {
    addonName,
    assetName: assetNameParts.join("/"),
  }
}

export class AddonRegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AddonRegistryError"
  }
}

export interface AddonRegistry {
  getDeckType: (type: string) => AddonDeckDefinition | undefined
  getButton: (type: string) => AddonButtonDefinition | undefined
  listButtons: () => AddonButtonDefinition[]
  registerAddon: (addon: SirenoAddon, options?: { rootDir?: string }) => void
  registerButton: (button: AddonButtonDefinition) => void
  requireAssetPath: (assetReference: string) => string
  resolveAssetPath: (assetReference: string) => string | undefined
}

export function createAddonRegistry(): AddonRegistry {
  const assets = new Map<string, string>()
  const buttons = new Map<string, AddonButtonDefinition>()
  const decks = new Map<string, AddonDeckDefinition>()

  function registerButton(button: AddonButtonDefinition): void {
    if (buttons.has(button.type)) {
      throw new AddonRegistryError(`Button type '${button.type}' is already registered`)
    }

    buttons.set(button.type, button)
  }

  function registerDeck(deck: AddonDeckDefinition): void {
    if (decks.has(deck.type)) {
      throw new AddonRegistryError(`Deck type '${deck.type}' is already registered`)
    }

    decks.set(deck.type, deck)
  }

  return {
    getDeckType(type) {
      return decks.get(type)
    },
    getButton(type) {
      return buttons.get(type)
    },
    listButtons() {
      return [...buttons.values()]
    },
    registerAddon(addon, options) {
      for (const button of addon.buttons) {
        registerButton(button)
      }

      for (const deck of addon.decks ?? []) {
        registerDeck(deck)
      }

      for (const [assetName, assetPath] of Object.entries(addon.assets ?? {})) {
        assets.set(getAssetKey(addon.name, assetName), options?.rootDir ? resolve(options.rootDir, assetPath) : assetPath)
      }
    },
    registerButton,
    requireAssetPath(assetReference) {
      const resolvedAssetPath = this.resolveAssetPath(assetReference)
      if (!resolvedAssetPath) {
        throw new AddonRegistryError(`Asset '${assetReference}' is not registered`)
      }

      return resolvedAssetPath
    },
    resolveAssetPath(assetReference) {
      const parsed = parseAssetReference(assetReference)
      if (!parsed) {
        return undefined
      }

      return assets.get(getAssetKey(parsed.addonName, parsed.assetName))
    },
  }
}
