import { z } from "zod"

export const configSchema = z.object({
  emoji: z.string().min(1),
})
export type ConfigSchema = z.infer<typeof configSchema>
