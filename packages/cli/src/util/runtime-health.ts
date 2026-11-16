import { runtimeIdentity } from "./runtime-identity"
import { z } from "zod"

export type RendererState =
  | "starting"
  | "healthy"
  | "recovering"
  | "failed"
  | "not-applicable"
export interface RuntimeHealth {
  identity: { version: string; buildId: string | null }
  core: "starting" | "ready" | "stopping"
  renderer: { state: RendererState; lastFrameAt: number | null }
}

export const runtimeHealthSchema = z
  .object({
    identity: z
      .object({ version: z.string(), buildId: z.string().nullable() })
      .strict(),
    core: z.enum(["starting", "ready", "stopping"]),
    renderer: z
      .object({
        state: z.enum([
          "starting",
          "healthy",
          "recovering",
          "failed",
          "not-applicable",
        ]),
        lastFrameAt: z.number().finite().nullable(),
      })
      .strict(),
  })
  .strict()

const health: RuntimeHealth = {
  identity: runtimeIdentity,
  core: "starting",
  renderer: { state: "starting", lastFrameAt: null },
}

export const runtimeHealth = {
  snapshot: (): RuntimeHealth => ({
    ...health,
    renderer: { ...health.renderer },
  }),
  setCore: (state: RuntimeHealth["core"]): void => {
    health.core = state
  },
  setRenderer: (
    state: RendererState,
    lastFrameAt = health.renderer.lastFrameAt,
  ): void => {
    health.renderer = { state, lastFrameAt }
  },
}
