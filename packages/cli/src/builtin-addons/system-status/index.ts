import type { AddonRegistry } from "@/addon/registry"
import { systemStatusManifest } from "./manifest"

export const registerSystemStatusAddon = (
  registry: AddonRegistry,
): void => {
  registry.load(systemStatusManifest)
}

export {
  systemStatusManifest,
  systemStatusAddon,
  GenericSystemStatusDefaults,
  GenericSystemStatusSchema,
  SYSTEM_METRIC_IDS,
} from "./manifest"
export type { SystemMetricId } from "./manifest"