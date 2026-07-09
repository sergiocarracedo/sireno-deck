import { z } from "zod"

export const WEATHER_DEFAULT_POLL_MS = 600_000

const WeatherLocationSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    name: z.string().min(1).optional(),
  })
  .strict()

const WeatherButtonSchema = z
  .object({
    location: WeatherLocationSchema.optional(),
    poll_interval_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .default(WEATHER_DEFAULT_POLL_MS),
    units: z.enum(["metric", "imperial"]).optional().default("metric"),
  })
  .strict()

export const configSchema = WeatherButtonSchema
export type ConfigSchema = z.infer<typeof configSchema>
export type WeatherLocation = z.infer<typeof WeatherLocationSchema>
export type WeatherButtonConfig = z.infer<typeof WeatherButtonSchema>

export interface WeatherSnapshot {
  readonly available: boolean
  readonly temperature?: number
  readonly windSpeed?: number
  readonly description?: string
  readonly units: "metric" | "imperial"
  readonly wmoCode?: number
}
