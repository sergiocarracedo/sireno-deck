import type { AddonButtonTypeBackend } from "@/addon/api";

import configSchema from "./config";

export default {
  configSchema,
  onTap: ({ methods }) => {
    void methods["navigate-deck"]?.("emoji");
  },
} satisfies AddonButtonTypeBackend;