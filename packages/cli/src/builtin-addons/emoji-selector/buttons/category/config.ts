import { z } from "zod"

export const configSchema = z.object({
  target_deck: z.string().min(1),
  icon: z.string().min(1),
  label: z.string().min(1),
})
export type ConfigSchema = z.infer<typeof configSchema>
