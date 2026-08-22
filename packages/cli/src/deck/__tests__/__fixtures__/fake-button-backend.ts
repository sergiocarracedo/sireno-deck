import type {
  AddonButtonService,
  AddonButtonServiceContext,
  AddonGlobalService,
} from "@/addon/api"

export interface ButtonCalls {
  onMount: number
  onTap: number
  onDblTap: number
  onHold: number
  onDispose: number
  onSuspend: number
  onResume: number
  onMountSignals: Array<{ aborted: boolean }>
}

const makeCalls = (): ButtonCalls => ({
  onMount: 0,
  onTap: 0,
  onDblTap: 0,
  onHold: 0,
  onDispose: 0,
  onSuspend: 0,
  onResume: 0,
  onMountSignals: [],
})

let calls: ButtonCalls = makeCalls()
let lastButtonCtx: AddonButtonServiceContext<unknown> | null = null

export const __getCalls = (): ButtonCalls => calls
export const __resetCalls = (): void => {
  calls = makeCalls()
  lastButtonCtx = null
}

const serviceWithoutLifecycle: AddonButtonService<unknown> = {
  onMount: (ctx) => {
    calls.onMount += 1
    calls.onMountSignals.push({ aborted: ctx.signal.aborted })
    lastButtonCtx = ctx
  },
  onTap: () => {
    calls.onTap += 1
  },
  onDblTap: () => {
    calls.onDblTap += 1
  },
  onHold: () => {
    calls.onHold += 1
  },
  dispose: () => {
    calls.onDispose += 1
  },
}

const serviceWithLifecycle: AddonButtonService<unknown> = {
  onMount: (ctx) => {
    calls.onMount += 1
    calls.onMountSignals.push({ aborted: ctx.signal.aborted })
    lastButtonCtx = ctx
  },
  onTap: () => {
    calls.onTap += 1
  },
  dispose: () => {
    calls.onDispose += 1
  },
}

export const __getLastButtonCtx =
  (): AddonButtonServiceContext<unknown> | null => lastButtonCtx

export const manifest = {
  name: "fake-buttons",
  globalService: {
    onLoad: () => undefined,
  } satisfies AddonGlobalService,
  buttonTypes: {
    "player-no-lifecycle": { service: serviceWithoutLifecycle },
    "player-with-lifecycle": { service: serviceWithLifecycle },
  },
}
