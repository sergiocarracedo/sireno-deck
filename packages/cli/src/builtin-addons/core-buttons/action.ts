import { z } from "zod";

import type { Methods } from "@/deck/methods.ts";

export const actionConfigSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export type ActionConfig = z.infer<typeof actionConfigSchema>;

export interface ActionButtonContext {
  config: ActionConfig;
  methods: Methods;
}

export const coreActionButton = {
  type: "core:action" as const,
  internal: false as const,
  configSchema: actionConfigSchema,
  onTap: async ({ config, methods }: ActionButtonContext) => {
    return await methods.runCommand(config.command, {
      ...(config.cwd !== undefined ? { cwd: config.cwd } : {}),
      ...(config.env !== undefined ? { env: config.env } : {}),
    });
  },
  render: () => null,
};
