import { z } from 'zod'

export const MediaPlayerButtonSchema = z
  .object({
    hold_command: z.string().min(1).optional(),
    poll_interval_ms: z.number().int().min(500).default(1_000),
    render_interval_ms: z.number().int().min(500).default(1_000),
  })
  .strict()

export type MediaPlayerButtonConfig = z.infer<typeof MediaPlayerButtonSchema>

export const MediaMuteButtonSchema = z
  .object({
    poll_interval_ms: z.number().int().min(500).default(2_500),
    render_interval_ms: z.number().int().min(500).default(2_500),
  })
  .strict()

export type MediaMuteButtonConfig = z.infer<typeof MediaMuteButtonSchema>

export const MediaVolumeButtonSchema = z
  .object({
    poll_interval_ms: z.number().int().min(500).default(1_500),
    render_interval_ms: z.number().int().min(500).default(1_500),
    variant: z.enum(['up', 'down']),
  })
  .strict()

export type MediaVolumeButtonConfig = z.infer<typeof MediaVolumeButtonSchema>
