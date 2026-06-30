import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const WEATHER_DEFAULT_POLL_MS = 600_000;

export const WeatherLocationSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    name: z.string().min(1).optional(),
  })
  .strict();

export const WeatherButtonSchema = z
  .object({
    location: WeatherLocationSchema.optional(),
    poll_interval_ms: z.number().int().positive().optional().default(WEATHER_DEFAULT_POLL_MS),
    units: z.enum(["metric", "imperial"]).optional().default("metric"),
  })
  .strict();

export type WeatherLocation = z.infer<typeof WeatherLocationSchema>;
export type WeatherButtonConfig = z.infer<typeof WeatherButtonSchema>;

export interface WeatherSnapshot {
  available: boolean;
  temperature?: number;
  windSpeed?: number;
  description?: string;
  units: "metric" | "imperial";
}

export const weatherButtonBackend: AddonButtonTypeBackend = {
  configSchema: WeatherButtonSchema,
  defaultRenderIntervalMs: WEATHER_DEFAULT_POLL_MS,
};
