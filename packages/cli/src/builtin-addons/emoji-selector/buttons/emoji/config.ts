import { z } from 'zod'

export const configSchema = z.object({
  emoji: z.string().length(1),
  shortcode: z.string(),
})
export type ConfigSchema = z.infer<typeof configSchema>
