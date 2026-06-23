import { z } from "zod";

export const mediaSampleConfigSchema = z.object({
  channel: z.string().min(1),
  fallback: z.unknown().optional(),
});

export type MediaSampleConfig = z.infer<typeof mediaSampleConfigSchema>;

export const coreMediaSampleButton = {
  type: "core:media-sample" as const,
  internal: false as const,
  configSchema: mediaSampleConfigSchema,
  onTap: async () => {
    void 0;
  },
  render: () => null,
};
