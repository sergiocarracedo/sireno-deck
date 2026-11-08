import type {
  AddonButtonService,
  AddonButtonServiceContext,
  AddonServiceContext,
  AddonGlobalService,
} from "@/addon/api"

export interface FakeExternalButtonState {
  tapped: number
}

let capturedCtx: AddonServiceContext | null = null
let tapCount = 0
let buttonContexts: AddonButtonServiceContext<FakeExternalButtonState>[] = []

export const __getCapturedCtx = (): AddonServiceContext | null => capturedCtx

export const __resetCapturedCtx = (): void => {
  capturedCtx = null
  tapCount = 0
  buttonContexts = []
}

export const __getTapCount = (): number => tapCount
export const __getButtonContexts = () => buttonContexts

const buttonService: AddonButtonService<FakeExternalButtonState> = {
  onMount: (ctx) => {
    buttonContexts.push(ctx)
  },
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
