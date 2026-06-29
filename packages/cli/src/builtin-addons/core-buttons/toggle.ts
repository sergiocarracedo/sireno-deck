import { z } from "zod";

import type { Methods } from "@/deck/methods";
import type { Store } from "@/core/store";

export const toggleConfigSchema = z.object({
  key: z.string().min(1),
  default: z.boolean().default(false),
});

export type ToggleConfig = z.infer<typeof toggleConfigSchema>;

export interface ToggleButtonContext {
  config: ToggleConfig;
  methods: Methods;
  store: Store;
}

export const coreToggleButton = {
  type: "core:toggle" as const,
  internal: false as const,
  configSchema: toggleConfigSchema,
  onTap: async ({ config, methods, store }: ToggleButtonContext) => {
    const scope = store.buttonScope<boolean>("core-buttons", config.key);
    const current = scope.get("value") ?? config.default;
    scope.set("value", !current);
    methods.invalidate();
  },
  render: () => null,
};
