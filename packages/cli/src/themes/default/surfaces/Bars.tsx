export interface BarRow {
  value: number;
  min: number;
  max: number;
  accent?: boolean;
  label?: string;
}

export interface BarsProps {
  rows: BarRow[];
}

const computePercent = (row: BarRow): number => {
  const range = row.max - row.min;
  if (range <= 0) return 0;
  return Math.max(0, Math.min(100, ((row.value - row.min) / range) * 100));
};

import { Text } from "../components/Text.tsx";

export const Bars = ({ rows }: BarsProps) => {
  const visible = rows.slice(0, 3);
  return (
    <div className="flex h-full w-full flex-col items-stretch justify-center gap-1.5 p-3" data-sireno-ui-bars="true">
      {visible.map((row, idx) => {
        const pct = computePercent(row);
        const fill = row.accent ? "bg-bar-accent" : "bg-fg/40";
        return (
          <div key={idx} className="flex flex-col gap-1">
            {row.label !== undefined ? (
              <Text size="xs" tone="muted" typography="aux" fit="ellipsis">
                {row.label}
              </Text>
            ) : null}
            <div className="relative h-1.5 w-full overflow-hidden rounded bg-bar">
              <div
                className={`absolute inset-y-0 left-0 rounded ${fill}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const BarsDefaultExport = Bars;
