import { z } from "zod"

export const configSchema = z.object({
  step: z.number().positive().max(100).default(5),
})
export type ConfigSchema = z.infer<typeof configSchema>
