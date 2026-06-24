import { z } from "zod";

export const MediaPlayerButtonSchema = z.object({}).strict();
export const MediaMuteButtonSchema = z.object({}).strict();
export const MediaVolumeButtonSchema = z
  .object({
    direction: z.enum(["up", "down"]).optional().default("up"),
    step: z.number().int().min(1).max(50).optional().default(5),
  })
  .strict();

export type MediaPlayerButtonConfig = z.infer<typeof MediaPlayerButtonSchema>;
export type MediaMuteButtonConfig = z.infer<typeof MediaMuteButtonSchema>;
export type MediaVolumeButtonConfig = z.infer<typeof MediaVolumeButtonSchema>;