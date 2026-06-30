import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const emojiButtonConfigSchema = z.object({}).strict();

export const emojiButtonBackend: AddonButtonTypeBackend = {
  configSchema: emojiButtonConfigSchema,
};
