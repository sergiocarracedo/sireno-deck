import { z } from "zod";

export const settingsBrightnessConfigSchema = z.object({});

export type SettingsBrightnessConfig = z.infer<typeof settingsBrightnessConfigSchema>;

export const coreSettingsBrightnessButton = {
  type: "core:settings-brightness" as const,
  internal: true as const,
  configSchema: settingsBrightnessConfigSchema,
  onTap: async () => {
    void 0;
  },
  render: () => null,
};
