import { z } from "zod";
import type { Methods } from "@/deck/methods";
import type { Store } from "@/core/store";
import type { AddonButtonTypeService } from "@/addon/api";

import { configSchema } from "./config";

type Config = z.infer<typeof configSchema>;

export default {
  configSchema,
  onTap: async ({ config, methods, store }: { config: Config; methods: Methods; store: Store }) => {
    const scope = store.buttonScope<boolean>("core-buttons", config.key);
    const current = scope.get("value") ?? config.default;
    scope.set("value", !current);
    methods.invalidate();
  },
} satisfies AddonButtonTypeService;
