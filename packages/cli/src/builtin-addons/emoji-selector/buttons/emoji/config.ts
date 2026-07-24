import { z } from "zod"

// ponytail: a single emoji can be multiple UTF-16 code units (flags = 2
// regional indicator code points; family ZWJ = many). Allow one extended
// pictographic, optionally chained with ZWJ sequences and VS16, OR two
// regional indicators (a flag).
const SINGLE_EMOJI =
  /^(?:[\p{Extended_Pictographic}\p{Emoji_Component}](?:\u200D[\p{Extended_Pictographic}\p{Emoji_Component}])*\uFE0F?|\p{Regional_Indicator}{2})$/u

export const configSchema = z.object({
  emoji: z.string().regex(SINGLE_EMOJI),
  shortcode: z.string(),
})
export type ConfigSchema = z.infer<typeof configSchema>
