import { useEffect, useState } from "react";

import type { AddonButtonTypeDefinition } from "@/addon/api.ts";
import { LabelValueList } from "@/themes/default/surfaces/LabelValueList.tsx";
import { Text } from "@/themes/default/components/Text.tsx";

import { describeWeatherCode } from "../domain/codes.ts";
import { fetchWeather } from "../domain/fetch.ts";
import { WeatherButtonSchema, type WeatherSnapshot } from "../schemas.ts";

export const builtinWeatherButton: AddonButtonTypeDefinition = {
  type: "weather",
  configSchema: WeatherButtonSchema,
  defaultRenderIntervalMs: ({ config }) => config.poll_interval_ms,
  render: ({ config }) => {
    const [snapshot, setSnapshot] = useState<WeatherSnapshot>({
      available: false,
      units: config.units,
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!config.location) {
        setSnapshot({ available: false, units: config.units });
        setError(null);
        return;
      }
      let cancelled = false;
      const tick = async () => {
        try {
          const next = await fetchWeather(config.location, config.units);
          if (!cancelled) {
            setSnapshot(next);
            setError(null);
          }
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        }
      };
      void tick();
      const id = setInterval(() => void tick(), config.poll_interval_ms);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [config]);

    if (!config.location) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Text size="sm" tone="muted">
            Configure weather
          </Text>
        </div>
      );
    }

    const tempUnit = snapshot.units === "imperial" ? "°F" : "°C";
    const windUnit = snapshot.units === "imperial" ? "mph" : "km/h";
    const rows = snapshot.available
      ? [
          { label: "Temp", tone: "fg" as const, value: `${snapshot.temperature ?? "—"}${tempUnit}` },
          {
            label: "Wind",
            tone: "fg" as const,
            value: `${snapshot.windSpeed ?? "—"}${windUnit}`,
          },
          {
            label: "Sky",
            tone: "accent" as const,
            value: describeWeatherCode(
              snapshot.description !== undefined ? Number.parseInt(snapshot.description, 10) : undefined,
            ),
          },
          ...(config.location.name ? [{ label: "Place", tone: "muted" as const, value: config.location.name }] : []),
        ]
      : [{ label: "Status", tone: "muted" as const, value: error ?? "Loading…" }];

    return (
      <div className="h-full w-full">
        <LabelValueList rows={rows} />
      </div>
    );
  },
};

export const weatherAddon = {
  apiVersion: 3 as const,
  name: "weather",
  kind: "runtime" as const,
  buttons: [builtinWeatherButton],
};