import { useEffect, useState } from "react";

import type { AddonButtonTypeDefinition } from "@/addon/api.ts";
import { executeCommand } from "@/action/executor.ts";
import { LabelValueList } from "@/themes/default/surfaces/LabelValueList.tsx";

import { formatCommandOutput } from "../domain/format-command-output.ts";
import {
  ValueDisplayButtonSchema,
  type ValueDisplayButtonConfig,
  type ValueEntry,
} from "../schemas.ts";

interface ValueSnapshot {
  available: boolean;
  raw: string;
}

const runEntry = async (entry: ValueEntry, defaultTimeoutMs: number): Promise<ValueSnapshot> => {
  try {
    const result = await executeCommand({
      command: entry.command,
      timeoutMs: entry.timeout_ms ?? defaultTimeoutMs,
    });
    if (result.failed || result.code !== 0) {
      return { available: false, raw: "" };
    }
    return { available: true, raw: result.stdout };
  } catch {
    return { available: false, raw: "" };
  }
};

const refreshValues = async (config: ValueDisplayButtonConfig): Promise<readonly ValueSnapshot[]> =>
  Promise.all(config.values.map((entry) => runEntry(entry, config.timeout_ms)));

export const builtinValueDisplayButton: AddonButtonTypeDefinition = {
  type: "core:value-display",
  configSchema: ValueDisplayButtonSchema,
  defaultRenderIntervalMs: ({ config }) => config.poll_interval_ms,
  render: ({ config }) => {
    const [values, setValues] = useState<readonly ValueSnapshot[]>(() =>
      config.values.map(() => ({ available: false, raw: "" })),
    );
    useEffect(() => {
      let cancelled = false;
      const tick = async () => {
        const next = await refreshValues(config);
        if (!cancelled) setValues(next);
      };
      void tick();
      const id = setInterval(() => void tick(), config.poll_interval_ms);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [config]);

    const rows = config.values.map((entry, idx) => {
      const snapshot = values[idx] ?? { available: false, raw: "" };
      const formatted = snapshot.available
        ? formatCommandOutput(snapshot.raw, entry.formatter, entry.units)
        : { available: false as const, value: "N/A", ...(entry.units ? { units: entry.units } : {}) };
      return {
        label: entry.label,
        tone: formatted.available ? ("fg" as const) : ("muted" as const),
        value: formatted.value,
      };
    });

    return (
      <div className="h-full w-full">
        <LabelValueList rows={rows} />
      </div>
    );
  },
};

export const valueDisplayAddon = {
  apiVersion: 3 as const,
  name: "value-display",
  kind: "runtime" as const,
  buttons: [builtinValueDisplayButton],
};