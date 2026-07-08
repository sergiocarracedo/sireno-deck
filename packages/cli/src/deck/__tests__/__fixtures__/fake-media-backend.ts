import type { AddonServiceContext, AddonGlobalService } from "@/addon/api";

let capturedCtx: AddonServiceContext | null = null;

export const __getCapturedCtx = (): AddonServiceContext | null => capturedCtx;

export const __resetCapturedCtx = (): void => {
  capturedCtx = null;
};

export const manifest = {
  name: "fake-media",
  globalService: {
    pollers: [
      {
        id: "state",
        channel: "fake-media:state",
        intervalMs: 2000,
        poll: () => ({ title: "track", artist: "artist" }),
      },
    ],
    methods: {
      refresh: async () => {
        await capturedCtx?.poll("state");
      },
    },
    onLoad: (ctx: AddonServiceContext) => {
      capturedCtx = ctx;
      ctx.publish({ initial: true });
    },
  } satisfies AddonGlobalService,
};
