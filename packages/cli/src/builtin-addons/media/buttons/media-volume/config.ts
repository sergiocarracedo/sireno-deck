import { z } from "zod";

export const configSchema = z
  .object({
    direction: z.enum(["up", "down"]).optional().default("up"),
    step: z.number().int().min(1).max(50).optional().default(5),
  })
  .strict();

export type ConfigSchema = z.infer<typeof configSchema>;