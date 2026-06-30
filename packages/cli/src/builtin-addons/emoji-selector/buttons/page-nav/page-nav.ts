import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const pageNavConfigSchema = z.object({}).strict();

export const pageNavButtonBackend: AddonButtonTypeBackend = {
  configSchema: pageNavConfigSchema,
  defaultRenderIntervalMs: 60000,
};
