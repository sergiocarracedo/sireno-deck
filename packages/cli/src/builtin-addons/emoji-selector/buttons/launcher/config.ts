import { z } from "zod"

import { EmojiLauncherButtonSchema } from "../../support"

export const configSchema = EmojiLauncherButtonSchema
export type ConfigSchema = z.infer<typeof configSchema>
