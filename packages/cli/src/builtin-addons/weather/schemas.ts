import { z } from 'zod'

export const WeatherButtonSchema = z
  .object({
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        name: z.string().min(1).optional(),
      })
      .optional(),
    poll_interval_min: z.number().int().min(1).default(10),
    render_interval_ms: z.number().int().min(60_000).default(600_000),
    units: z.enum(['metric', 'imperial']).default('metric'),
    use_ip_geolocation: z.boolean().optional(),
  })
  .strict()

export type WeatherButtonConfig = z.infer<typeof WeatherButtonSchema>
