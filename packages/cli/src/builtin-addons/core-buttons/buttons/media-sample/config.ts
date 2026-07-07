import { z } from "zod";

export const configSchema = z.object({
  channel: z.string().min(1),
  fallback: z.unknown().optional(),
});
export type ConfigSchema = z.infer<typeof configSchema>