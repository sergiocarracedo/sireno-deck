import { z } from "zod"

import { EMOJI_RE } from "@/core/icon-source"

export const configSchema = z.object({
  emoji: z
    .string()
    .regex(EMOJI_RE)
    .meta({ title: "Emoji", "x-control": "emoji" }),
  shortcode: z.string().optional().meta({ title: "Shortcode" }),
})
export type ConfigSchema = z.infer<typeof configSchema>
