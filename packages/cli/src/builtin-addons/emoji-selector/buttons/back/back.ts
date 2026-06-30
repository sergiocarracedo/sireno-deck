import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const backConfigSchema = z.object({}).strict();

export const backButtonBackend: AddonButtonTypeBackend = {
  configSchema: backConfigSchema,
  onTap: ({ methods }) => {
    void methods["navigate-deck"]?.("main");
  },
};
