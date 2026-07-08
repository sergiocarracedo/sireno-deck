import { z } from "zod";

export const configSchema = z.object({
  step: z.number().positive().default(5),
});
export type ConfigSchema = z.infer<typeof configSchema>;
