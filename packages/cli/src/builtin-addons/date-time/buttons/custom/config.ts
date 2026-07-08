import { z } from "zod";

export const configSchema = z
  .object({
    format: z.string().min(1).optional().default("DD/MM/YYYY HH:mm:ss"),
  })
  .strict();

export type ConfigSchema = z.infer<typeof configSchema>;
