import type { AddonRegistry } from "@/addon/registry"
import { systemStatusManifest } from "./manifest"

export const registerSystemStatusAddon = (registry: AddonRegistry): void => {
  registry.load(systemStatusManifest)
}

export {
  POLL_INTERVAL_MS,
  SystemStatusConfigSchema,
  SYSTEM_METRIC_IDS,
  systemStatusAddon,
  systemStatusManifest,
} from "./manifest"
export type { SystemStatusConfig, SystemMetricId } from "./manifest"
export default systemStatusManifest
