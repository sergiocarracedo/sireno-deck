import type { AddonServiceContext, AddonGlobalService } from "@/addon/api";

import type { WeatherSnapshot, WeatherStateSnapshot } from "./buttons/weather/config";
import { cityKey } from "./provider/city-key";
import { fetchWeather } from "./provider/fetch";
import { resolveLocation, type GeocodedLocation } from "./provider/geocode";
import type { CityEntry } from "./provider/types";

const POLL_INTERVAL_MS = 600_000;

const cityRegistry = new Map<string, CityEntry>();
const resolvedCache = new Map<string, GeocodedLocation>();
let ctxRef: AddonServiceContext | undefined;

const resolveEntryLocation = async (
  entry: CityEntry,
  signal: AbortSignal,
): Promise<GeocodedLocation> => {
  if (typeof entry.location === "string") {
    const cached = resolvedCache.get(entry.location);
    if (cached) return cached;
    const resolved = await resolveLocation(entry.location, signal);
    resolvedCache.set(entry.location, resolved);
    return resolved;
  }
  return {
    latitude: entry.location.latitude,
    longitude: entry.location.longitude,
    name: entry.location.name ?? "Unknown",
  };
};

const uniqueCities = (): CityEntry[] => {
  const byKey = new Map<string, CityEntry>();
  for (const entry of cityRegistry.values()) {
    const loc = entry.location;
    const key = typeof loc === "string" ? loc : cityKey(loc);
    byKey.set(key, entry);
  }
  return [...byKey.values()];
};

const fetchAllCities = async (
  cities: CityEntry[],
  signal: AbortSignal,
): Promise<WeatherStateSnapshot> => {
  const byCity: Record<string, WeatherSnapshot> = {};
  await Promise.all(
    cities.map(async (entry) => {
      const lookupKey =
        typeof entry.location === "string" ? entry.location : cityKey(entry.location);
      let resolved: GeocodedLocation;
      try {
        resolved = await resolveEntryLocation(entry, signal);
      } catch (err) {
        byCity[lookupKey] = {
          available: false,
          units: entry.units,
          description: err instanceof Error ? err.message : "geocoding failed",
        };
        return;
      }
      try {
        byCity[lookupKey] = await fetchWeather(resolved, entry.units, signal);
      } catch (err) {
        byCity[lookupKey] = {
          available: false,
          units: entry.units,
          description: err instanceof Error ? err.message : "fetch failed",
        };
      }
    }),
  );
  return { byCity };
};

export const globalService: AddonGlobalService = {
  methods: {
    registerCity: (buttonId: unknown, location: unknown, units: unknown): void => {
      cityRegistry.set(String(buttonId), {
        location: location as CityEntry["location"],
        units: units as CityEntry["units"],
      });
      ctxRef?.poll("current");
    },
    refreshWeather: (): void => {
      ctxRef?.poll("current");
    },
    unregisterCity: (buttonId: unknown): void => {
      cityRegistry.delete(String(buttonId));
    },
  },
  pollers: [
    {
      id: "current",
      channel: "weather:current",
      intervalMs: POLL_INTERVAL_MS,
      poll: async (ctx: AddonServiceContext): Promise<WeatherStateSnapshot> => {
        const cities = uniqueCities();
        if (cities.length === 0) {
          return { byCity: {} };
        }
        return fetchAllCities(cities, ctx.signal);
      },
    },
  ],
  onLoad: async (ctx: AddonServiceContext) => {
    ctxRef = ctx;
  },
  onUnload: () => {
    ctxRef = undefined;
    cityRegistry.clear();
    resolvedCache.clear();
  },
};
