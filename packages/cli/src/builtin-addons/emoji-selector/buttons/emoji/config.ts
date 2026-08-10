import { z } from "zod"

import { EMOJI_RE } from "@/core/icon-source"

export const configSchema = z.object({
  emoji: z.string().regex(EMOJI_RE),
  shortcode: z.string().optional(),
})
export type ConfigSchema = z.infer<typeof configSchema>
