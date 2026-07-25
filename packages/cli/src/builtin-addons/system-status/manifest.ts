import type { AddonGlobalPoller, AddonManifestV1 } from "@/addon/api"

import chartFrontend from "./buttons/chart/frontend"
import { ChartConfigSchema } from "./buttons/chart/schemas"
import kpisFrontend from "./buttons/kpis/frontend"
import systemStatusFrontend from "./buttons/system-status/frontend"
import {
  GenericSystemStatusDefaults,
  GenericSystemStatusSchema,
  type GenericSystemStatusConfig,
} from "./buttons/system-status/schemas"
import { CHART_HISTORY_CHANNEL } from "./domain"
import { SYSTEM_METRIC_IDS, SystemMetricId } from "./shared/metrics-catalog"

// ponytail: pollers are server-only; lazy-import live-metrics so the manifest
// can be loaded by the frontend addon virtual module without dragging
// node:os / node:fs into the browser bundle.
function makePoller(metricId: SystemMetricId): AddonGlobalPoller {
  return {
    id: `metric:${metricId}`,
    channel: `runtime:system-status:${metricId}`,
    // ponytail: one cadence for all metrics. `GenericSystemStatusDefaults.pollInterval`
    // is the single source of truth. Per-button overrides would require moving
    // polling into per-button onMount handlers (multiple buttons on the same
    // metric would race on one channel); not worth the refactor today.
    intervalMs: GenericSystemStatusDefaults.pollInterval,
    poll: async () => {
      const { probeMetric } = await import("./domain/live-metrics")
      const result = await probeMetric(metricId)
      if (result.value !== undefined && result.available) {
        const { feedSampler } = await import("./domain/chart-sampler")
        feedSampler(metricId, result.value, Date.now())
      }
      return result
    },
  }
}

export const systemStatusManifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "system-status",
  buttonTypes: {
    "system-status:system-status": {
      frontend: systemStatusFrontend,
      service: {
        configSchema: GenericSystemStatusSchema,
        internal: false,
        gestureHandlers: ["tap"] as const,
      },
    },
    "system-status:kpis": {
      frontend: kpisFrontend,
      service: {
        configSchema: GenericSystemStatusSchema,
        internal: false,
        gestureHandlers: ["tap"] as const,
      },
    },
    "system-status:chart": {
      frontend: chartFrontend,
      service: {
        configSchema: ChartConfigSchema,
        internal: false,
        gestureHandlers: ["tap"] as const,
      },
    },
  },
  globalService: {
    pollers: [
      ...SYSTEM_METRIC_IDS.map(makePoller),
      {
        id: "metric:chart-history",
        channel: CHART_HISTORY_CHANNEL,
        intervalMs: GenericSystemStatusDefaults.pollInterval,
        poll: async () => {
          const { getSamplerState } = await import("./domain/chart-sampler")
          return getSamplerState()
        },
      },
    ],
  },
}

export const systemStatusAddon = systemStatusManifest
export default systemStatusManifest

export {
  GenericSystemStatusDefaults,
  GenericSystemStatusSchema,
  SYSTEM_METRIC_IDS,
  type GenericSystemStatusConfig,
}
export type { SystemMetricId }
