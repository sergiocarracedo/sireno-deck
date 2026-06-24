import { useEffect, useState } from "react";

import type { AddonButtonTypeDefinition } from "@/addon/api.ts";
import { Bars } from "@/themes/default/surfaces/Bars.tsx";
import { LabelValueList } from "@/themes/default/surfaces/LabelValueList.tsx";

import { getCanonicalSystemMetrics } from "../domain/live-metrics.ts";
import {
  SystemStatusButtonSchema,
  type CanonicalSystemMetricSnapshot,
  type SystemStatusMetricConfig,
} from "../schemas.ts";

const getBarValue = (
  metric: CanonicalSystemMetricSnapshot,
  configuredMax?: number,
): { maxValue: number; value: number } => {
  if (!metric.available) {
    return { maxValue: configuredMax ?? 100, value: 0 };
  }
  if (configuredMax !== undefined && metric.value !== undefined) {
    return { maxValue: configuredMax, value: Math.max(0, metric.value) };
  }
  if (metric.max !== undefined && metric.value !== undefined) {
    return { maxValue: metric.max, value: Math.max(0, metric.value) };
  }
  if (metric.percentage !== undefined) {
    return { maxValue: 100, value: Math.max(0, metric.percentage) };
  }
  return { maxValue: configuredMax ?? 100, value: 0 };
};

const barsView = (
  metrics: readonly SystemStatusMetricConfig[],
  snapshots: readonly CanonicalSystemMetricSnapshot[],
): React.ReactNode => {
  const items = metrics.map((metric, idx) => {
    const snap = snapshots[idx] ?? { id: metric.metric, available: false, formattedValue: metric.unavailable_label ?? "N/A" };
    const barValue = getBarValue(snap, metric.max_value);
    return {
      label: metric.label,
      accent: metric.color === "accent",
      value: barValue.value,
      min: 0,
      max: barValue.maxValue,
    };
  });
  return (
    <div className="h-full w-full p-1">
      <Bars rows={items.slice(0, 3)} />
    </div>
  );
};

const textView = (
  metrics: readonly SystemStatusMetricConfig[],
  snapshots: readonly CanonicalSystemMetricSnapshot[],
): React.ReactNode => {
  const rows = metrics.map((metric, idx) => {
    const snap = snapshots[idx];
    const value = snap?.available
      ? snap.formattedValue
      : (metric.unavailable_label ?? "N/A");
    return { label: metric.label, tone: snap?.available ? ("fg" as const) : ("muted" as const), value };
  });
  return (
    <div className="h-full w-full">
      <LabelValueList rows={rows} />
    </div>
  );
};

export const builtinSystemStatusButton: AddonButtonTypeDefinition = {
  type: "system-status",
  configSchema: SystemStatusButtonSchema,
  defaultRenderIntervalMs: ({ config }) => config.poll_interval_ms,
  render: ({ config }) => {
    const [snapshots, setSnapshots] = useState<readonly CanonicalSystemMetricSnapshot[]>(() =>
      config.metrics.map((m) => ({
        id: m.metric,
        available: false,
        formattedValue: m.unavailable_label ?? "N/A",
      })),
    );
    useEffect(() => {
      let cancelled = false;
      const tick = async () => {
        const next = await getCanonicalSystemMetrics(config.metrics.map((m) => m.metric));
        if (!cancelled) setSnapshots(next);
      };
      void tick();
      const id = setInterval(() => void tick(), config.poll_interval_ms);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [config]);

    const variant = config.variant ?? "text";
    return variant === "bars" ? barsView(config.metrics, snapshots) : textView(config.metrics, snapshots);
  },
};

export const systemStatusAddon = {
  apiVersion: 3 as const,
  name: "system-status",
  kind: "runtime" as const,
  buttons: [builtinSystemStatusButton],
};