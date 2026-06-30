import { z } from "zod";

import type { Methods } from "@/deck/methods";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const changeDeckConfigSchema = z.object({
  deck: z.string().min(1),
  addToHistory: z.boolean().default(true),
});

export type ChangeDeckConfig = z.infer<typeof changeDeckConfigSchema>;

export const changeDeckButtonBackend: AddonButtonTypeBackend = {
  configSchema: changeDeckConfigSchema,
  onTap: async ({ config, methods }: { config: ChangeDeckConfig; methods: Methods }) => {
    methods.navigateToDeck({ id: config.deck, addToHistory: config.addToHistory });
  },
};
