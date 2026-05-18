import { resolve } from "node:path"

import type {
  AddonButtonDefinition,
  AddonDeckDefinition,
  RegisteredAddonStylePrimitive,
  RegisteredAddonWrapperPrimitive,
  SirenoAddon,
} from "./api.js"

const ADDON_ASSET_PREFIX = "addon://"

function getAssetKey(addonName: string, assetName: string): string {
  return `${addonName}/${assetName}`
}

function getPrimitiveKey(addonName: string, primitiveName: string): string {
  return `${addonName}/${primitiveName}`
}

function parseAssetReference(assetReference: string): { addonName: string; assetName: string } | undefined {
  if (!assetReference.startsWith(ADDON_ASSET_PREFIX)) {
    return undefined
  }

  const [addonName, ...assetNameParts] = assetReference.slice(ADDON_ASSET_PREFIX.length).split("/")
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
  getStylePrimitive: (id: string) => RegisteredAddonStylePrimitive | undefined
  getWrapperPrimitive: (id: string) => RegisteredAddonWrapperPrimitive | undefined
  listButtons: () => AddonButtonDefinition[]
  registerAddon: (addon: SirenoAddon, options?: { rootDir?: string }) => void
  registerButton: (button: AddonButtonDefinition) => void
  resolveAssetPath: (assetReference: string) => string | undefined
}

export function createAddonRegistry(): AddonRegistry {
  const assets = new Map<string, string>()
  const buttons = new Map<string, AddonButtonDefinition>()
  const decks = new Map<string, AddonDeckDefinition>()
  const styles = new Map<string, RegisteredAddonStylePrimitive>()
  const wrappers = new Map<string, RegisteredAddonWrapperPrimitive>()

  function assertPrimitiveName(name: string, kind: "style" | "wrapper"): void {
    if (name.includes("/")) {
      throw new AddonRegistryError(`${kind} primitive name '${name}' must not contain '/'`)
    }
  }

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

  function registerStylePrimitive(addonName: string, style: RegisteredAddonStylePrimitive): void {
    assertPrimitiveName(style.name, "style")
    if (styles.has(style.id)) {
      throw new AddonRegistryError(`Style primitive '${style.id}' is already registered`)
    }

    styles.set(style.id, style)
  }

  function registerWrapperPrimitive(addonName: string, wrapper: RegisteredAddonWrapperPrimitive): void {
    assertPrimitiveName(wrapper.name, "wrapper")
    if (wrappers.has(wrapper.id)) {
      throw new AddonRegistryError(`Wrapper primitive '${wrapper.id}' is already registered`)
    }

    wrappers.set(wrapper.id, wrapper)
  }

  return {
    getDeckType(type) {
      return decks.get(type)
    },
    getButton(type) {
      return buttons.get(type)
    },
    getStylePrimitive(id) {
      return styles.get(id)
    },
    getWrapperPrimitive(id) {
      return wrappers.get(id)
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

      for (const style of addon.styles ?? []) {
        registerStylePrimitive(addon.name, {
          ...style,
          addonName: addon.name,
          id: getPrimitiveKey(addon.name, style.name),
        })
      }

      for (const wrapper of addon.wrappers ?? []) {
        registerWrapperPrimitive(addon.name, {
          ...wrapper,
          addonName: addon.name,
          id: getPrimitiveKey(addon.name, wrapper.name),
        })
      }

      for (const [assetName, assetPath] of Object.entries(addon.assets ?? {})) {
        assets.set(getAssetKey(addon.name, assetName), options?.rootDir ? resolve(options.rootDir, assetPath) : assetPath)
      }
    },
    registerButton,
    resolveAssetPath(assetReference) {
      const parsed = parseAssetReference(assetReference)
      if (!parsed) {
        return undefined
      }

      return assets.get(getAssetKey(parsed.addonName, parsed.assetName))
    },
  }
}
