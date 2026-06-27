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
      <span className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
        {name !== undefined ? `${name}: configure weather` : "Configure weather"}
      </span>
    );
  }
  const unitTemp = data.units === "imperial" ? "°F" : "°C";
  const unitWind = data.units === "imperial" ? "mph" : "km/h";
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 font-mono">
      {name !== undefined && (
        <span className="text-[10px] uppercase tracking-wider text-muted">{name}</span>
      )}
      <span className="text-2xl font-semibold leading-none text-fg">
        {data.temperature?.toFixed(0)}
        {unitTemp}
      </span>
      <span className="text-[10px] text-muted">{data.description ?? "—"}</span>
      {data.windSpeed !== undefined && (
        <span className="text-[10px] text-muted">
          {data.windSpeed.toFixed(0)} {unitWind}
        </span>
      )}
    </span>
  );
};

export default Component;
