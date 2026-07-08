import type { WeatherLocation } from "../buttons/weather/config";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  name?: string;
}

const cache = new Map<string, GeocodedLocation>();

export const geocodeLocation = async (
  location: string,
  signal?: AbortSignal,
): Promise<GeocodedLocation> => {
  const cached = cache.get(location);
  if (cached) return cached;

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", location);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error(`Geocoding failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    results?: Array<{
      latitude: number;
      longitude: number;
      name: string;
      country?: string;
    }>;
  };

  const result = json.results?.[0];
  if (!result) {
    throw new Error(`Location not found: ${location}`);
  }

  const resolved: GeocodedLocation = {
    latitude: result.latitude,
    longitude: result.longitude,
    name: result.country ? `${result.name}, ${result.country}` : result.name,
  };

  cache.set(location, resolved);
  return resolved;
};

export const resolveLocation = async (
  location: WeatherLocation,
  signal?: AbortSignal,
): Promise<GeocodedLocation> => {
  if (typeof location === "string") {
    return geocodeLocation(location, signal);
  }
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name ?? "Unknown",
  };
};
