import { z } from "zod";

export const configSchema = z.object({});
export type ConfigSchema = z.infer<typeof configSchema>;
