import type {
  AddonButtonService,
  AddonServiceContext,
  AddonGlobalService,
} from "@/addon/api"

export interface FakeExternalButtonState {
  tapped: number
}

let capturedCtx: AddonServiceContext | null = null
let tapCount = 0

export const __getCapturedCtx = (): AddonServiceContext | null => capturedCtx

export const __resetCapturedCtx = (): void => {
  capturedCtx = null
  tapCount = 0
}

export const __getTapCount = (): number => tapCount

const buttonService: AddonButtonService<FakeExternalButtonState> = {
  onTap: () => {
    tapCount += 1
  },
}

export const globalService: AddonGlobalService = {
  pollers: [
    {
      id: "state",
      channel: "fake-external:state",
      intervalMs: 1000,
      poll: () => ({ ok: true }),
    },
  ],
  methods: {
    ping: async () => {
      await capturedCtx?.poll("state")
    },
  },
  onLoad: (ctx: AddonServiceContext) => {
    capturedCtx = ctx
    ctx.publish({ initial: true })
  },
}

export const manifest = {
  name: "fake-external",
  buttonTypes: {
    "fake-external:button": {
      frontend: () => null,
      service: buttonService,
    },
  },
  globalService,
}
