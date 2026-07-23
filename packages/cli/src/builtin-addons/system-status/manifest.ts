import { z } from "zod"
import type { AddonManifestV1, AddonGlobalPoller } from "@/addon/api"

import genericFrontend from "./buttons/generic/frontend"
import {
  GenericSystemStatusDefaults,
  GenericSystemStatusSchema,
} from "./buttons/generic/schemas"
import {
  probeMetric,
  SYSTEM_METRIC_IDS,
  type SystemMetricId,
} from "./domain"

const DEFAULT_POLL_INTERVAL_MS = 2_000

function makePoller(metricId: SystemMetricId): AddonGlobalPoller {
  return {
    id: `metric:${metricId}`,
    channel: `runtime:system-status:${metricId}`,
    intervalMs: DEFAULT_POLL_INTERVAL_MS,
    poll: () => probeMetric(metricId),
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