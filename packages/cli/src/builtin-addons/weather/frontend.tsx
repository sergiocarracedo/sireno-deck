import { Text } from "@sireno-deck-2/cli";
import { useAddonChannel } from "sireno-deck-2/react";

interface ComponentProps {
  readonly config: unknown;
  readonly state: unknown;
}

interface WeatherSnapshot {
  readonly available: boolean;
  readonly temperature?: number;
  readonly windSpeed?: number;
  readonly description?: string;
  readonly units: "metric" | "imperial";
}

const Component = ({ config }: ComponentProps) => {
  const { name } = (config as { location?: { name?: string } })?.location ?? {};
  const { data } = useAddonChannel<WeatherSnapshot>("weather:current");
  if (data === undefined || data.available === false) {
    return (
      <Text size="xs" tone="muted" typography="mono" className="flex h-full w-full items-center justify-center">
        {name !== undefined ? `${name}: configure weather` : "Configure weather"}
      </Text>
    );
  }
  const unitTemp = data.units === "imperial" ? "°F" : "°C";
  const unitWind = data.units === "imperial" ? "mph" : "km/h";
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
      {name !== undefined && (
        <Text size="xs" tone="muted" typography="aux" fit="ellipsis">
          {name}
        </Text>
      )}
      <Text size="2xl" tone="fg" className="font-semibold leading-none">
        {data.temperature?.toFixed(0)}
        {unitTemp}
      </Text>
      <Text size="xs" tone="muted">{data.description ?? "—"}</Text>
      {data.windSpeed !== undefined && (
        <Text size="xs" tone="muted">
          {data.windSpeed.toFixed(0)} {unitWind}
        </Text>
      )}
    </span>
  );
};

export default Component;
