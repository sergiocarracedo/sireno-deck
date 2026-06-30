import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const categoryConfigSchema = z.object({}).strict();

export const categoryButtonBackend: AddonButtonTypeBackend = {
  configSchema: categoryConfigSchema,
  defaultRenderIntervalMs: 60000,
};
