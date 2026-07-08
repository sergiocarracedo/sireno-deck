import type { AddonButtonTypeService } from "@/addon/api";

import { configSchema } from "./config";

export default {
  configSchema,
  onTap: async () => {},
} satisfies AddonButtonTypeService;
