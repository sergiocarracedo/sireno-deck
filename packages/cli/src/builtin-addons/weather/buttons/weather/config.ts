import { z } from "zod";

export const WEATHER_DEFAULT_POLL_MS = 600_000;

const WeatherLocationSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    name: z.string().min(1).optional(),
  })
  .strict();

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
  .strict();

export default WeatherButtonSchema;