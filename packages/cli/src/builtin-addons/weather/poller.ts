import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { fetchWeather } from "./domain/fetch"
import type { AddonPoller } from "@/addon/api-types"

const readWeatherConfig = (): {
  location?: { latitude: number; longitude: number; name?: string }
  units: "metric" | "imperial"
} => {
  try {
    const configPath = join(process.cwd(), "config.yml")
    if (!existsSync(configPath)) return { units: "metric" }
    const raw = readFileSync(configPath, "utf8")
    const block = raw.match(/core:weather:\s*\n((?:\s+[^\n]+\n)*)/)
    if (block === null) return { units: "metric" }
    const inner = block[1] ?? ""
    const latMatch = inner.match(/latitude:\s*([\d.-]+)/)
    const lonMatch = inner.match(/longitude:\s*([\d.-]+)/)
    const unitsMatch = inner.match(/units:\s*(metric|imperial)/)
    const nameMatch = inner.match(/name:\s*([^\n]+)/)
    if (latMatch === null || lonMatch === null) return { units: "metric" }
    return {
      location: {
        latitude: Number.parseFloat(latMatch[1] as string),
        longitude: Number.parseFloat(lonMatch[1] as string),
        ...(nameMatch !== null ? { name: nameMatch[1]?.trim() } : {}),
      },
      units: (unitsMatch?.[1] as "metric" | "imperial" | undefined) ?? "metric",
    }
  } catch {
    return { units: "metric" }
  }
}

export const createPoller = (): AddonPoller => ({
  channels: [
    {
      channel: "weather:current",
      intervalMs: 600_000,
      poll: async () => {
        const cfg = readWeatherConfig()
        if (cfg.location === undefined) {
          return {
            available: false,
            units: cfg.units,
            description: "Configure weather",
          }
        }
        try {
          const snapshot = await fetchWeather(cfg.location, cfg.units)
          return {
            available: snapshot.available,
            temperature: snapshot.temperature,
            windSpeed: snapshot.windSpeed,
            description: snapshot.description,
            wmoCode: snapshot.wmoCode,
            units: cfg.units,
          }
        } catch (err) {
          return {
            available: false,
            units: cfg.units,
            description: err instanceof Error ? err.message : "fetch failed",
          }
        }
      },
    },
  ],
})
