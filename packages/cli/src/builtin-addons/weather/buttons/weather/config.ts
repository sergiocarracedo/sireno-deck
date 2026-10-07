import { z } from "zod"

export const WEATHER_DEFAULT_POLL_MS = 600_000

const WeatherLocationSchema = z
  .object({
    latitude: z.number().min(-90).max(90).meta({ title: "Latitude" }),
    longitude: z.number().min(-180).max(180).meta({ title: "Longitude" }),
    name: z.string().min(1).optional().meta({ title: "Location name" }),
  })
  .strict()

const WeatherButtonSchema = z
  .object({
    location: WeatherLocationSchema.optional().meta({ title: "Location" }),
    poll_interval_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .default(WEATHER_DEFAULT_POLL_MS)
      .meta({ title: "Refresh interval (ms)" }),
    units: z
      .enum(["metric", "imperial"])
      .optional()
      .default("metric")
      .meta({ title: "Units" }),
  })
  .strict()

export const configSchema = WeatherButtonSchema
export type ConfigSchema = z.infer<typeof configSchema>
export type WeatherLocation = z.infer<typeof WeatherLocationSchema>
export type WeatherButtonConfig = z.infer<typeof WeatherButtonSchema>
