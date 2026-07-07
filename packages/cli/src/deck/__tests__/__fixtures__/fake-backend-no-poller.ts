import type { AddonGlobalBackend } from "@/addon/api";

export const manifest = {
  name: "fake-media",
  globalBackend: {
    onLoad: (ctx: { publish: (data: unknown) => void }) => {
      ctx.publish({ initial: true });
    },
  } satisfies AddonGlobalBackend,
};