import type { AddonButtonTypeBackend } from "@/addon/api";

import { configSchema } from "./config";

export default {
  configSchema,
  onTap: async () => {},
} satisfies AddonButtonTypeBackend;