import type pino from "pino"

import type { PubSub, Runtime, RuntimeDeck, Store } from "@/deck"
import type { WsBridge } from "@/render/ws-bridge"
import type { StreamDeckDevice } from "@/device/stream-deck"

export interface OutputContext {
  readonly frontendUrl: string
  readonly runtime: Runtime
  readonly pubSub: PubSub
  readonly store: Store
  readonly decks: ReadonlyArray<RuntimeDeck>
  readonly theme: { name: string }
  readonly logger: pino.Logger
  readonly addonByType: Map<
    string,
    { name: string; frontendEntry: string | null }
  >
  readonly bridge: WsBridge
  readonly configPath?: string
  readonly frontendVite?: {
    readonly process: { kill(signal: string): void }
    readonly url: string
  }
}

export interface OutputHandle {
  readonly frontendUrl: string
  readonly emulatorUrl?: string
  readonly wsUrl?: string
  readonly childPids: ReadonlyArray<number>
  stop(): Promise<void>
}

export interface OutputClient {
  start(ctx: OutputContext): Promise<OutputHandle>
}

export interface RealOutputClientDeps {
  readonly device: StreamDeckDevice
  readonly intervalMs?: number
}
