import type { BrightnessProvider } from "@/system/provider"
import type { AddonPoller } from "@/addon/api-types"

export interface BrightnessPollerDeps {
  readonly brightnessProvider: BrightnessProvider | null
}

export const createPoller = (deps: BrightnessPollerDeps): AddonPoller => ({
  channels: [
    {
      channel: "brightness:current",
      intervalMs: 2_000,
      poll: async () => {
        if (deps.brightnessProvider === null) {
          return { value: 0, max: 100 }
        }
        try {
          const reading = await deps.brightnessProvider.getCurrent()
          return { value: reading.value, max: reading.max }
        } catch {
          return { value: 0, max: 100 }
        }
      },
    },
  ],
})
