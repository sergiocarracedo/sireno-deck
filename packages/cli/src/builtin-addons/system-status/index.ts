import type { AddonRegistry } from "@/addon/registry"
import { systemStatusManifest } from "./manifest"

export const registerSystemStatusAddon = (registry: AddonRegistry): void => {
  registry.load(systemStatusManifest)
}

export {
  GenericSystemStatusDefaults,
  GenericSystemStatusSchema,
  SYSTEM_METRIC_IDS,
  systemStatusAddon,
  systemStatusManifest,
} from "./manifest"
export type { SystemMetricId } from "./manifest"
export default systemStatusManifest
