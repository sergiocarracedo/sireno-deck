import { Text } from "@sireno-deck-2/cli";
import { useAddonChannel } from "sireno-deck-2/react";

interface ComponentProps {
  readonly config: unknown;
  readonly state: unknown;
}

interface MetricEntry {
  readonly id: string;
  readonly label: string;
  readonly value: number | string | undefined;
  readonly maxValue?: number;
}

interface MetricsState {
  readonly metrics: ReadonlyArray<MetricEntry>;
}

const Component = ({ config }: ComponentProps) => {
  const { variant } = (config as { variant?: "text" | "bars" }) ?? {};
  const { data } = useAddonChannel<MetricsState>("system-status:metrics");
  const metrics = data?.metrics ?? [];
  if (variant === "bars") {
    return (
      <span className="flex h-full w-full flex-col justify-center gap-1 p-1.5">
        {metrics.slice(0, 4).map((m) => {
          const pct =
            typeof m.value === "number" && m.maxValue !== undefined && m.maxValue > 0
              ? Math.max(0, Math.min(100, (m.value / m.maxValue) * 100))
              : null;
          return (
            <span key={m.id} className="flex flex-col gap-0.5">
              <span className="flex items-baseline justify-between">
                <Text size="xs" tone="muted">{m.label}</Text>
                <Text size="xs" tone="fg">{m.value ?? "—"}</Text>
              </span>
              {pct !== null && (
                <span className="block h-1 w-full overflow-hidden rounded bg-bar">
                  <span
                    className="block h-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </span>
              )}
            </span>
          );
        })}
      </span>
    );
  }
  return (
    <span className="flex h-full w-full flex-col items-stretch justify-center gap-0.5 p-1.5">
      {metrics.slice(0, 4).map((m) => (
        <span key={m.id} className="flex justify-between gap-2">
          <Text size="xs" tone="muted">{m.label}</Text>
          <Text size="xs" tone="fg">{m.value ?? "—"}</Text>
        </span>
      ))}
    </span>
  );
};

export default Component;
