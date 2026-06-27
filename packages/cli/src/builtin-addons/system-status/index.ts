import { systemStatusAddon } from "./buttons/system-status.tsx";

export { builtinSystemStatusButton } from "./buttons/system-status.tsx";
export {
  SystemStatusButtonSchema,
  SystemStatusMetricConfigSchema,
  SystemStatusMetricIdSchema,
  SYSTEM_STATUS_DEFAULT_POLL_MS,
} from "./schemas.ts";
export { getCanonicalSystemMetrics } from "./domain/live-metrics.ts";
export { createPoller } from "./poller.ts";
export type {
  SystemStatusMetricId,
  SystemStatusMetricConfig,
  SystemStatusButtonConfig,
  CanonicalSystemMetricSnapshot,
} from "./schemas.ts";

export default systemStatusAddon;