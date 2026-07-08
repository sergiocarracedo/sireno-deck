import { BrowserRenderer } from "@/render/browser-renderer"

import type {
  OutputClient,
  OutputContext,
  OutputHandle,
  RealOutputClientDeps,
} from "./types"

export class RealOutputClient implements OutputClient {
  private readonly device: RealOutputClientDeps["device"]
  private readonly intervalMs: number | undefined

  constructor(deps: RealOutputClientDeps) {
    this.device = deps.device
    this.intervalMs = deps.intervalMs
  }

  async start(ctx: OutputContext): Promise<OutputHandle> {
    const device = this.device
    const renderer = new BrowserRenderer({
      frontendUrl: `${ctx.frontendUrl}?compact=1`,
      device,
      logger: ctx.logger,
      ...(this.intervalMs !== undefined ? { intervalMs: this.intervalMs } : {}),
      pubSub: ctx.pubSub,
    })
    await renderer.start()
    return {
      frontendUrl: ctx.frontendUrl,
      childPids: [],
      stop: async (): Promise<void> => {
        try {
          await renderer.stop()
        } finally {
          await device.close()
        }
      },
    }
  }
}
