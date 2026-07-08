import { z } from "zod";

export const configSchema = z.object({
  format: z.string().default("HH:mm"),
});
export type ConfigSchema = z.infer<typeof configSchema>;
