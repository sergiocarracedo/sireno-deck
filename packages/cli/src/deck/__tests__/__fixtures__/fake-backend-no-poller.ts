import type { AddonGlobalService } from "@/addon/api";

export const manifest = {
  name: "fake-media",
  globalService: {
    onLoad: (ctx: { publish: (data: unknown) => void }) => {
      ctx.publish({ initial: true });
    },
  } satisfies AddonGlobalService,
};
