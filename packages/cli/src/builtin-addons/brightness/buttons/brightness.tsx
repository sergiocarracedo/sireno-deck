import {
  ButtonSurface,
  defineMountedButton,
} from "@/addon/api"
import { setBrightnessAll } from "@/device/registry"
import { z } from "zod"

import { BrightnessSurface, nextPercentage } from "./BrightnessSurface"

export const BrightnessButtonSchema = z.object({})

export type BrightnessButtonConfig = z.infer<typeof BrightnessButtonSchema>

type BrightnessStoreState = {
  percentage: number
}

function getState(snapshot: unknown): BrightnessStoreState {
  if (typeof snapshot === "object" && snapshot !== null) {
    return snapshot as BrightnessStoreState
  }
  return { percentage: 50 }
}

const builtinBrightnessButton = defineMountedButton({
  configSchema: BrightnessButtonSchema,
  defaultRenderIntervalMs: () => 5_000,
  onActivate: async ({ store }) => {
    const initial = getState(store.button.snapshot).percentage
    store.button.set({ percentage: initial })
  },
  onTap: async ({ store }) => {
    const current = getState(store.button.snapshot).percentage
    const next = nextPercentage(current)
    const result = await setBrightnessAll(next)
    store.button.set({
      percentage: next,
      lastResult: {
        succeeded: result.succeeded,
        failed: result.failed,
      },
    })
  },
  render: ({ store }) => {
    const { percentage } = getState(store.button.snapshot)
    return (
      <ButtonSurface full>
        <BrightnessSurface percentage={percentage} />
      </ButtonSurface>
    )
  },
  type: "brightness",
})

export { builtinBrightnessButton }
