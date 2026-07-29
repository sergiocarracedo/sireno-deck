import { z } from "zod"

export const configSchema = z
  .object({
    durationSec: z.number().int().positive().default(1500),
  })
  .strict()

export type ConfigSchema = z.infer<typeof configSchema>

export const DEFAULT_DURATION_SEC = 1500

export interface PersistedState {
  status: "idle" | "running" | "finished"
  startTsMs: number | null
  durationSec: number
}
