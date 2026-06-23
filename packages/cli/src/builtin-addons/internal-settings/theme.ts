import { z } from "zod";

export const settingsThemeConfigSchema = z.object({});

export type SettingsThemeConfig = z.infer<typeof settingsThemeConfigSchema>;

export const coreSettingsThemeButton = {
  type: "core:settings-theme" as const,
  internal: true as const,
  configSchema: settingsThemeConfigSchema,
  onTap: async () => {
    void 0;
  },
  render: () => null,
};
