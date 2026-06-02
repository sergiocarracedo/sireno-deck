import { z } from 'zod'

export const MediaPlayerButtonSchema = z
  .object({
    hold_command: z.string().min(1).optional(),
    poll_interval_ms: z.number().int().min(500).default(1_000),
    render_interval_ms: z.number().int().min(500).default(1_000),
    unavailable_label: z.string().min(1).optional(),
  })
  .strict()

export type MediaPlayerButtonConfig = z.infer<typeof MediaPlayerButtonSchema>
