import type { AddonButtonTypeBackend } from "@/addon/api";
import { configSchema } from "./config";

export default {
  configSchema,
  onTap: async ({ methods }: { methods: Record<string, (...args: unknown[]) => unknown> }) => {
    await methods["media:toggle"]?.();
  },
} satisfies AddonButtonTypeBackend;
