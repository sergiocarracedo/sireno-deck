import { z } from "zod";

import type { Store } from "@/core/store.ts";

export const settingsAboutConfigSchema = z.object({});

export type SettingsAboutConfig = z.infer<typeof settingsAboutConfigSchema>;

export interface SettingsAboutContext {
  store: Store;
}

export const coreSettingsAboutButton = {
  type: "core:settings-about" as const,
  internal: true as const,
  configSchema: settingsAboutConfigSchema,
  onTap: async ({ store }: SettingsAboutContext) => {
    store.addonScope<number>("internal-settings").set("about:viewedAt", Date.now());
  },
  render: () => null,
};
