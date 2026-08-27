import type { AddonRegistry } from "@/addon/registry"

import { manifest } from "./manifest.js"

export const registerCodingAgentsAddon = (registry: AddonRegistry): void => {
  registry.load(manifest)
}

export { manifest } from "./manifest.js"
export default manifest
