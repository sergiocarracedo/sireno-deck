import { z } from "zod";

export const sessionInfoConfigSchema = z.object({});

export type SessionInfoConfig = z.infer<typeof sessionInfoConfigSchema>;

export const coreSessionInfoButton = {
  type: "core:session-info" as const,
  internal: false as const,
  configSchema: sessionInfoConfigSchema,
  onTap: async () => {
    void 0;
  },
  render: () => null,
};
