import type { AddonServiceContext, AddonGlobalService } from "@/addon/api"

let capturedCtx: AddonServiceContext | null = null
let capturedConfig: unknown

export const __getCapturedCtx = (): AddonServiceContext | null => capturedCtx
export const __getCapturedConfig = (): unknown => capturedConfig

export const __resetCapturedCtx = (): void => {
  capturedCtx = null
  capturedConfig = undefined
}

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
        await capturedCtx?.poll("state")
      },
    },
    onLoad: (ctx: AddonServiceContext, config?: unknown) => {
      capturedCtx = ctx
      capturedConfig = config
      ctx.publish({ initial: true })
    },
  } satisfies AddonGlobalService,
}
