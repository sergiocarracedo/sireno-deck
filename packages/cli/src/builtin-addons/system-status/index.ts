export {
  systemStatusManifest,
  systemStatusAddon,
  systemStatusButtonTypes,
} from "./manifest"

import type { AddonRegistry } from "@/addon/registry"
import type { PubSub } from "@/core/pub-sub"
import { startSystemStatusPoller } from "./service"
import { systemStatusManifest } from "./manifest"

export const registerSystemStatusAddon = (
  registry: AddonRegistry,
  pubSub: PubSub,
  signal: AbortSignal,
): void => {
  registry.load(systemStatusManifest)
  startSystemStatusPoller(pubSub, signal)
}
