import type { AddonButtonTypeActionContext, AddonButtonTypeBackend } from "@/addon/api";
import { configSchema } from "./config";

type Config = {
  readonly direction?: "up" | "down";
  readonly step?: number;
};

export default {
  configSchema,
  onTap: async (
    ctx: AddonButtonTypeActionContext & { buttonId: string },
  ) => {
    const { methods } = ctx;
    const config = ctx.config as Config;
    const direction = config.direction ?? "up";
    const step = config.step ?? 5;
    if (direction === "down") {
      await (methods["media:volumeDown"] as (...args: unknown[]) => unknown)?.(step / 100);
    } else {
      await (methods["media:volumeUp"] as (...args: unknown[]) => unknown)?.(step / 100);
    }
  },
} satisfies AddonButtonTypeBackend;
