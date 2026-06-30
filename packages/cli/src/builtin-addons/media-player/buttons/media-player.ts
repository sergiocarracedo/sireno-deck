import { z } from "zod";

import type { AddonButtonTypeBackend } from "@/addon/api";

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

export const mediaPlayerButtonBackend: AddonButtonTypeBackend = {
  configSchema: MediaPlayerButtonSchema,
  defaultRenderIntervalMs: 2000,
  full: true,
};

export const mediaMuteButtonBackend: AddonButtonTypeBackend = {
  configSchema: MediaMuteButtonSchema,
  defaultRenderIntervalMs: 2000,
  onTap: ({ methods }) => {
    void methods["media-toggle-mute"]?.();
  },
};

export const mediaVolumeButtonBackend: AddonButtonTypeBackend = {
  configSchema: MediaVolumeButtonSchema,
  defaultRenderIntervalMs: 2000,
  onTap: ({ methods, config }) => {
    const cfg = config as MediaVolumeButtonConfig;
    const method = cfg.direction === "down" ? "media-volume-down" : "media-volume-up";
    void methods[method]?.(cfg.step);
  },
};
