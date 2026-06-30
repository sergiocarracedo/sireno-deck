import { z } from "zod";

import { type Store } from "@/core/store";

import type { AddonButtonTypeBackend } from "@/addon/api";

export const aboutConfigSchema = z.object({});

export type AboutConfig = z.infer<typeof aboutConfigSchema>;

export interface AboutBackendContext {
  store: Store;
}

export const aboutButtonBackend: AddonButtonTypeBackend = {
  configSchema: aboutConfigSchema,
  internal: true,
  onTap: async ({ methods, buttonId }: Parameters<NonNullable<AddonButtonTypeBackend["onTap"]>>[0]) => {
    const ctx = methods as unknown as { store?: Store };
    if (ctx.store) {
      ctx.store.addonScope<number>("internal-settings").set(`${buttonId}:viewedAt`, Date.now());
    }
  },
};
