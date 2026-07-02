import type {
  AddonBackendContext,
  AddonGlobalBackend,
} from "@/addon/api";

let capturedCtx: AddonBackendContext | null = null;

export const __getCapturedCtx = (): AddonBackendContext | null => capturedCtx;

export const __resetCapturedCtx = (): void => {
  capturedCtx = null;
};

export const manifest = {
  name: "fake-media",
  globalBackend: {
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
    onLoad: (ctx: AddonBackendContext) => {
      capturedCtx = ctx;
      ctx.publish({ initial: true });
    },
  } satisfies AddonGlobalBackend,
};