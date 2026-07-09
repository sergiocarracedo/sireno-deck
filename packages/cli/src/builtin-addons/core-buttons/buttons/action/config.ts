import { z } from "zod"

export const configSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
})
export type ConfigSchema = z.infer<typeof configSchema>
