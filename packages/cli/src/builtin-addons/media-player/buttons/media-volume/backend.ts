import type { AddonButtonTypeBackend } from "@/addon/api";

import configSchema from "./config";

type Config = z.infer<typeof configSchema>;

export default {
  configSchema,
  defaultRenderIntervalMs: 2000,
  onTap: ({ methods, config }: { methods: Record<string, (...args: unknown[]) => unknown>; config: Config }) => {
    const method =
      config.direction === "down" ? "media-volume-down" : "media-volume-up";
    void methods[method]?.(config.step);
  },
} satisfies AddonButtonTypeBackend;