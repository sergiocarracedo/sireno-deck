import { z } from "zod"

export const configSchema = z.object({
  deck: z.string().min(1),
  addToHistory: z.boolean().default(true),
})
export type ConfigSchema = z.infer<typeof configSchema>
