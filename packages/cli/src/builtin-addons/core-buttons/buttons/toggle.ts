import { z } from "zod";

import type { Methods } from "@/deck/methods";
import type { Store } from "@/core/store";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const toggleConfigSchema = z.object({
  key: z.string().min(1),
  default: z.boolean().default(false),
});

export type ToggleConfig = z.infer<typeof toggleConfigSchema>;

export const toggleButtonBackend: AddonButtonTypeBackend = {
  configSchema: toggleConfigSchema,
  onTap: async ({ config, methods, store }: { config: ToggleConfig; methods: Methods; store: Store }) => {
    const scope = store.buttonScope<boolean>("core-buttons", config.key);
    const current = scope.get("value") ?? config.default;
    scope.set("value", !current);
    methods.invalidate();
  },
};
