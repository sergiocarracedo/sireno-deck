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
  readonly configPath?: string
  readonly logger: pino.Logger
  readonly frontendUrl?: string
  readonly port?: number
  readonly intervalMs?: number
  /**
   * --remote: bind WS bridge and Vite to 0.0.0.0 and token-gate the HTTP
   * servers. The CLI prints a LAN-accessible QR code. Default false.
   */
  readonly remote?: boolean
  /**
   * --no-autoopen: do not launch the emulator URL in the system browser.
   * Useful for capture tooling and headless runs. Default false.
   */
  readonly noAutoOpen?: boolean
  /**
   * The resolved LAN IP to use in the runtime-state.json. Only set when
   * remote is true or --emulator is set.
   */
  readonly lanHost?: string
  /**
   * All discovered LAN addresses, used in runtime-state.json so the CLI can
   * enumerate them in the QR banner.
   */
  readonly lanAddresses?: ReadonlyArray<string>
  /**
   * Rebuild the runtime deck set for a new device keyCount. The bridge then
   * re-broadcasts a fresh deck-config so the frontend re-renders into the
   * correct grid. Optional — emulator-only callers provide this; real
   * devices have a fixed keyCount and skip the rebuild.
   */
  readonly rebuildDecksForKeyCount?: (
    keyCount: number,
  ) => ReadonlyArray<RuntimeDeck>
  readonly onChildPid?: (pid: number) => void
  /**
   * Called when a supervised child (frontend/emulator vite) gives up after
   * exhausting its retry budget. The pipeline uses this to resolve `done` and
   * trigger the full shutdown sequence. ponytail: kept optional so existing
   * tests that don't simulate subprocess crashes don't have to wire it.
   */
  readonly onChildCrash?: () => void
}

export interface OutputHandle {
  readonly descriptor: DeviceDescriptor
  readonly frontendUrl: string
  readonly emulatorUrl?: string
  readonly wsUrl?: string
  readonly childPids: ReadonlyArray<number>
  pushBlackFrame?(): Promise<void>
  pushRawImage?(filePath: string): Promise<void>
  stop(): Promise<void>
}
