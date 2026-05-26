import { createElement } from "react"
import { defineMountedButton } from "../../../../src/addon/api.js"

const passthroughSchema = {
  safeParse(value: unknown) {
    return { success: true as const, data: value as Record<string, unknown> }
  },
}

function getButtonTaps(snapshot: unknown): number {
  return (snapshot as { taps?: number } | undefined)?.taps ?? 0
}

function getAddonTotal(snapshot: unknown): number {
  return (snapshot as { total?: number } | undefined)?.total ?? 0
}

function renderStoreLabel(label: string, buttonSnapshot: unknown, addonSnapshot: unknown): string {
  return `${label}:button=${getButtonTaps(buttonSnapshot)}:addon=${getAddonTotal(addonSnapshot)}`
}

const addon = {
  apiVersion: 1,
  name: "phase-24-local-mounted-addon",
  buttons: [
    defineMountedButton({
      configSchema: passthroughSchema,
      onTap({ config, methods, store }) {
        store.button.update((snapshot) => ({ taps: getButtonTaps(snapshot) + 1 }))
        store.addon.update((snapshot) => ({ total: getAddonTotal(snapshot) + 1 }))

        if (typeof config.target_deck === "string") {
          return methods.navigateToDeck(config.target_deck)
        }
      },
      render({ config, store }) {
        return createElement("p", null, renderStoreLabel(String(config.label ?? "Mounted"), store.button.snapshot, store.addon.snapshot))
      },
      type: "phase-24-mounted-button",
    }),
    defineMountedButton({
      configSchema: passthroughSchema,
      onTap({ config, methods }) {
        if (typeof config.target_deck === "string") {
          return methods.navigateToDeck(config.target_deck)
        }

        return undefined
      },
      render({ config, store }) {
        return createElement("p", null, renderStoreLabel(String(config.label ?? "Observer"), store.button.snapshot, store.addon.snapshot))
      },
      type: "phase-24-mounted-observer",
    }),
  ],
}

export default addon
