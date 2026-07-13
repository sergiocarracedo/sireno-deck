import type pino from "pino"

import type { PubSub, Runtime, RuntimeDeck, Store } from "@/deck"
import type { DeviceDescriptor } from "@/device/registry"
import type { WsBridge } from "@/render/ws-bridge"

export type OutputKind = "real" | "emulator"

export interface OutputClient {
  readonly kind: OutputKind
  validateReady(): Promise<void>
  listDevices(): Promise<ReadonlyArray<DeviceDescriptor>>
  selectDevice(
    devices: ReadonlyArray<DeviceDescriptor>,
    savedId: string | null,
    logger: pino.Logger,
  ): Promise<DeviceDescriptor>
  storeSelection(descriptor: DeviceDescriptor): Promise<void>
  init(opts: InitOptions): Promise<OutputHandle>
}

export interface InitOptions {
  readonly bridge: WsBridge
  readonly runtime: Runtime
  readonly pubSub: PubSub
  readonly store: Store
  readonly decks: ReadonlyArray<RuntimeDeck>
  readonly theme: { name: string; apiVersion: number }
  readonly themeDir: string
  readonly logger: pino.Logger
  readonly frontendUrl?: string
  readonly port?: number
  readonly intervalMs?: number
}

export interface OutputHandle {
  readonly descriptor: DeviceDescriptor
  readonly frontendUrl: string
  readonly emulatorUrl?: string
  readonly wsUrl?: string
  readonly childPids: ReadonlyArray<number>
  stop(): Promise<void>
}
