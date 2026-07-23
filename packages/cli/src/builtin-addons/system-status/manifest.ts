import { z } from "zod"
import type { AddonManifestV1, AddonGlobalPoller } from "@/addon/api"

import genericFrontend from "./buttons/generic/frontend"
import {
  GenericSystemStatusDefaults,
  GenericSystemStatusSchema,
} from "./buttons/generic/schemas"
import { SYSTEM_METRIC_IDS, type SystemMetricId } from "./domain"

// ponytail: pollers are server-only; lazy-import live-metrics so the manifest
// can be loaded by the frontend addon virtual module without dragging
// node:os / node:fs into the browser bundle.
function makePoller(metricId: SystemMetricId): AddonGlobalPoller {
  return {
    id: `metric:${metricId}`,
    channel: `runtime:system-status:${metricId}`,
    intervalMs: 2_000,
    poll: async () => {
      const { probeMetric } = await import("./domain/live-metrics")
      return probeMetric(metricId)
    },
  }
}

export const systemStatusManifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "system-status",
  buttonTypes: {
    "system-status:system-status": {
      frontend: genericFrontend,
      service: {
        configSchema: GenericSystemStatusSchema,
        internal: false,
        gestureHandlers: ["tap"] as const,
      },
    },
  },
  globalService: {
    pollers: SYSTEM_METRIC_IDS.map(makePoller),
  },
}

export const systemStatusAddon = systemStatusManifest
export default systemStatusManifest

export { GenericSystemStatusDefaults, GenericSystemStatusSchema }
export { SYSTEM_METRIC_IDS }
export type { SystemMetricId }