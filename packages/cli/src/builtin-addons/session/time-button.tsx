import { z } from "zod";

export const sessionTimeConfigSchema = z.object({
  format: z.string().default("HH:mm"),
});

export type SessionTimeConfig = z.infer<typeof sessionTimeConfigSchema>;

export const sessionTimeButton = {
  type: "session:time" as const,
  internal: true as const,
  configSchema: sessionTimeConfigSchema,
  render: () => null,
};
