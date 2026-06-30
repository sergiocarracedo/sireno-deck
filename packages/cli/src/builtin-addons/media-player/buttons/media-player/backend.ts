import type { AddonButtonTypeBackend } from "@/addon/api";

import { configSchema } from "./config";

export default {
  configSchema,
  defaultRenderIntervalMs: 2000,
  full: true,
} satisfies AddonButtonTypeBackend;