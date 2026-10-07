import { z } from "zod"

export const configSchema = z.object({
  durationSec: z
    .number()
    .int()
    .positive()
    .default(1500)
    .meta({ title: "Duration (seconds)" }),
  notification: z
    .object({
      title: z
        .string()
        .default("Pomodoro")
        .meta({ title: "Notification title" }),
      body: z
        .string()
        .default("Time's up!")
        .meta({ title: "Notification message" }),
    })
    .default({
      title: "Pomodoro",
      body: "Time's up!",
    })
    .optional(),
})

export type ConfigSchema = z.infer<typeof configSchema>

export const DEFAULT_DURATION_SEC = 1500

export interface PersistedState {
  status: "idle" | "running" | "paused" | "finished"
  startTsMs: number | null
  durationSec: number
  remainingSec: number | null
}
