import { z } from "zod";

import type { Methods } from "@/deck/methods";

export const changeDeckConfigSchema = z.object({
  deck: z.string().min(1),
  addToHistory: z.boolean().default(true),
});

export type ChangeDeckConfig = z.infer<typeof changeDeckConfigSchema>;

export interface ChangeDeckButtonContext {
  config: ChangeDeckConfig;
  methods: Methods;
}

export const coreChangeDeckButton = {
  type: "core:change-deck" as const,
  internal: false as const,
  configSchema: changeDeckConfigSchema,
  onTap: async ({ config, methods }: ChangeDeckButtonContext) => {
    methods.navigateToDeck({ id: config.deck, addToHistory: config.addToHistory });
  },
  render: () => null,
};
