import { z } from 'zod'

export const MediaPlayerButtonSchema = z
  .object({
    hold_command: z.string().min(1).optional(),
    unavailable_label: z.string().min(1).optional(),
  })
  .strict()

export type MediaPlayerButtonConfig = z.infer<typeof MediaPlayerButtonSchema>
