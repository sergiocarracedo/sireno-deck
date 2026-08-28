import type { AddonRegistry } from "@/addon/registry"

import { manifest } from "./manifest.js"

// ponytail: the global service lives in global-entry.ts, NOT here — this
// module is imported by the frontend's virtual addons/registry, and node
// builtins reachable from index.ts crash the browser bundle. The bridge
// finds the node-side entry via the scanner's globalServiceEntry.

export const registerCodingAgentsAddon = (registry: AddonRegistry): void => {
  registry.load(manifest)
}

export { manifest } from "./manifest.js"
export default manifest
