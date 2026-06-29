import { systemStatusAddon } from "./buttons/system-status";

export { builtinSystemStatusButton } from "./buttons/system-status";
export {
  SystemStatusButtonSchema,
  SystemStatusMetricConfigSchema,
  SystemStatusMetricIdSchema,
  SYSTEM_STATUS_DEFAULT_POLL_MS,
} from "./schemas";
export { getCanonicalSystemMetrics } from "./domain/live-metrics";
export { createPoller } from "./poller";
export type {
  SystemStatusMetricId,
  SystemStatusMetricConfig,
  SystemStatusButtonConfig,
  CanonicalSystemMetricSnapshot,
} from "./schemas";

export default systemStatusAddon;