import { Text, Chip } from "@/ui/index";
import { useAddonChannel } from "@/api/react";
import type { AddonFrontendButton } from "@/addon/api";

interface WeatherSnapshot {
  readonly available: boolean;
  readonly temperature?: number;
  readonly windSpeed?: number;
  readonly description?: string;
  readonly units: "metric" | "imperial";
  readonly wmoCode?: number;
}

const WMO_ICONS: Record<number, string> = {
  0: "☀",
  1: "🌤",
  2: "⛅",
  3: "☁",
  45: "🌫",
  48: "🌫",
  51: "🌦",
  53: "🌦",
  55: "🌧",
  56: "🌧",
  57: "🌧",
  61: "🌧",
  63: "🌧",
  65: "🌧",
  66: "🌧",
  67: "🌧",
  71: "🌨",
  73: "🌨",
  75: "🌨",
  77: "🌨",
  80: "🌦",
  81: "🌦",
  82: "🌧",
  85: "🌨",
  86: "🌨",
  95: "⛈",
  96: "⛈",
  99: "⛈",
};

const iconFor = (code?: number): string => {
  if (code === undefined) return "🌍";
  return WMO_ICONS[code] ?? "🌍";
};

export const WeatherButtonFrontend: AddonFrontendButton = ({ config }) => {
  const { name } = (config as { location?: { name?: string } })?.location ?? {};
  const { data } = useAddonChannel<WeatherSnapshot>("weather:current");
  if (!data?.available) {
    return (
      <Text
        size="xs"
        tone="muted"
        className="flex h-full w-full items-center justify-center"
      >
        {name ?? "Weather"}
      </Text>
    );
  }
  const unitTemp = data.units === "imperial" ? "°F" : "°C";
  const unitWind = data.units === "imperial" ? "mph" : "km/h";
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
      <Text size="3xl" tone="primary">
        {iconFor(data.wmoCode)}
      </Text>
      <Text size="xl" tone="fg" className="font-semibold leading-none">
        {data.temperature?.toFixed(0)}
        {unitTemp}
      </Text>
      {data.description && (
        <Text size="xs" tone="muted">
          {data.description}
        </Text>
      )}
      {data.windSpeed !== undefined && (
        <Chip tone="muted" size="sm">
          {data.windSpeed.toFixed(0)} {unitWind}
        </Chip>
      )}
      {name && (
        <Text size="xs" tone="muted" fit="ellipsis">
          {name}
        </Text>
      )}
    </span>
  );
};
