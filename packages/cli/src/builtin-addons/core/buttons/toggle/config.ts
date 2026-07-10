import { z } from "zod"

export const configSchema = z.object({
  key: z.string().min(1),
  default: z.boolean().default(false),
})
export type ConfigSchema = z.infer<typeof configSchema>
