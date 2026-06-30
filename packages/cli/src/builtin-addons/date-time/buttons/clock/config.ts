import { z } from "zod";

export const configSchema = z
  .object({
    showSeconds: z.boolean().optional().default(false),
    time_zone: z.string().min(1).optional(),
  })
  .strict();

export type ConfigSchema = z.infer<typeof configSchema>;