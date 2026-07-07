import { z } from "zod";
import type { AddonButtonTypeBackend } from "@/addon/api";

import { configSchema } from "./config";

type Config = z.infer<typeof configSchema>;

export default {
  configSchema,
  onTap: async ({ config, methods }) => {
    const step = (config.step ?? 5) / 100;
    await (methods["media:volumeDown"] as (s: number) => Promise<void>)?.(step);
  },
} satisfies AddonButtonTypeBackend<Config>;