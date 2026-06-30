import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const launcherConfigSchema = z.object({}).strict();

export const launcherButtonBackend: AddonButtonTypeBackend = {
  configSchema: launcherConfigSchema,
  onTap: ({ methods }) => {
    void methods["navigate-deck"]?.("emoji");
  },
};
