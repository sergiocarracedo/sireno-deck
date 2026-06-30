import { z } from "zod";

import type { Methods } from "@/deck/methods";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const actionConfigSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export type ActionConfig = z.infer<typeof actionConfigSchema>;

export const actionButtonBackend: AddonButtonTypeBackend = {
  configSchema: actionConfigSchema,
  onTap: async ({ config, methods }: { config: ActionConfig; methods: Methods }) => {
    await methods.runCommand(config.command, {
      ...(config.cwd !== undefined ? { cwd: config.cwd } : {}),
      ...(config.env !== undefined ? { env: config.env } : {}),
    });
  },
};
