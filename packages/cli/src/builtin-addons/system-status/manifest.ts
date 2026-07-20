import { z } from "zod"
import type { AddonManifestV1 } from "@/addon/api"

import cpuFrontend from "./buttons/cpu/frontend"
import ramFrontend from "./buttons/ram/frontend"
import diskFrontend from "./buttons/disk/frontend"
import netFrontend from "./buttons/net/frontend"
import genericFrontend from "./buttons/generic/frontend"

const emptyConfigSchema = z.object({}).strict()

const genericConfigSchema = z
  .object({
    metric: z.string().min(1),
    label: z.string().optional(),
  })
  .strict()

export const systemStatusManifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "system-status",
  buttonTypes: {
    "system-status:cpu": {
      frontend: cpuFrontend,
      service: { configSchema: emptyConfigSchema, internal: false },
    },
    "system-status:ram": {
      frontend: ramFrontend,
      service: { configSchema: emptyConfigSchema, internal: false },
    },
    "system-status:disk": {
      frontend: diskFrontend,
      service: { configSchema: emptyConfigSchema, internal: false },
    },
    "system-status:net": {
      frontend: netFrontend,
      service: { configSchema: emptyConfigSchema, internal: false },
    },
    "system-status:status": {
      frontend: genericFrontend,
      service: { configSchema: genericConfigSchema, internal: false },
    },
  },
  publishIntervalMs: 1000,
}

export const systemStatusButtonTypes = [
  "system-status:cpu",
  "system-status:ram",
  "system-status:disk",
  "system-status:net",
  "system-status:status",
] as const

export const systemStatusAddon = systemStatusManifest
export default systemStatusManifest
