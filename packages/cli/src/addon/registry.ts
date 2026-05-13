import type { AddonButtonDefinition, SirenoAddon } from "./api.js"

export class AddonRegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AddonRegistryError"
  }
}

export interface AddonRegistry {
  getButton: (type: string) => AddonButtonDefinition | undefined
  listButtons: () => AddonButtonDefinition[]
  registerAddon: (addon: SirenoAddon) => void
  registerButton: (button: AddonButtonDefinition) => void
}

export function createAddonRegistry(): AddonRegistry {
  const buttons = new Map<string, AddonButtonDefinition>()

  function registerButton(button: AddonButtonDefinition): void {
    if (buttons.has(button.type)) {
      throw new AddonRegistryError(`Button type '${button.type}' is already registered`)
    }

    buttons.set(button.type, button)
  }

  return {
    getButton(type) {
      return buttons.get(type)
    },
    listButtons() {
      return [...buttons.values()]
    },
    registerAddon(addon) {
      for (const button of addon.buttons) {
        registerButton(button)
      }
    },
    registerButton,
  }
}
