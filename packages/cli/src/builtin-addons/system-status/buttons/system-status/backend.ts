import type { AddonButtonTypeBackend } from "@/addon/api";

import { configSchema } from "./config";

export default {
  configSchema,
  defaultRenderIntervalMs: 1000,
} satisfies AddonButtonTypeBackend;