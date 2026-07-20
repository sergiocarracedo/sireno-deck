import { z } from "zod"
import type { AddonManifestV1 } from "@/addon/api"

const emptyConfigSchema = z.object({}).strict()

export const systemStatusManifest: AddonManifestV1 = {
  name: "system-status",
  apiVersion: 1,
  buttons: [
    {
      type: "system-status:cpu",
      defaultButton: {
        type: "system-status:cpu",
        config: {},
      },
    },
    {
      type: "system-status:ram",
      defaultButton: {
        type: "system-status:ram",
        config: {},
      },
    },
    {
      type: "system-status:disk",
      defaultButton: {
        type: "system-status:disk",
        config: {},
      },
    },
    {
      type: "system-status:net",
      defaultButton: {
        type: "system-status:net",
        config: {},
      },
    },
  ],
  buttonTypes: [
    {
      type: "system-status:cpu",
      service: {
        configSchema: emptyConfigSchema,
        internal: false,
      },
      frontend: { main: "./buttons/cpu/frontend.tsx" },
    },
    {
      type: "system-status:ram",
      service: {
        configSchema: emptyConfigSchema,
        internal: false,
      },
      frontend: { main: "./buttons/ram/frontend.tsx" },
    },
    {
      type: "system-status:disk",
      service: {
        configSchema: emptyConfigSchema,
        internal: false,
      },
      frontend: { main: "./buttons/disk/frontend.tsx" },
    },
    {
      type: "system-status:net",
      service: {
        configSchema: emptyConfigSchema,
        internal: false,
      },
      frontend: { main: "./buttons/net/frontend.tsx" },
    },
  ],
}

export const systemStatusButtonTypes = [
  "system-status:cpu",
  "system-status:ram",
  "system-status:disk",
  "system-status:net",
] as const
