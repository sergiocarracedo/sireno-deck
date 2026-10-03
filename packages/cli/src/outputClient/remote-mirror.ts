import type pino from "pino"

import type { DeviceDescriptor } from "@/device/registry"

import { EmulatorOutputClient } from "./emulator"
import { RealOutputClient } from "./real"
import type { InitOptions, OutputClient, OutputHandle } from "./types"

/** Runs the physical deck and remote emulator against one runtime. */
export class RemoteMirrorOutputClient implements OutputClient {
  readonly kind = "real" as const

  private readonly real: RealOutputClient
  private readonly emulator = new EmulatorOutputClient()

  constructor(options: { readonly xdgConfigHome: string }) {
    this.real = new RealOutputClient(options)
  }

  validateReady(): Promise<void> {
    return this.real.validateReady()
  }

  listDevices(): Promise<ReadonlyArray<DeviceDescriptor>> {
    return this.real.listDevices()
  }

  async selectDevice(
    devices: ReadonlyArray<DeviceDescriptor>,
    savedId: string | null,
    logger: pino.Logger,
  ): Promise<DeviceDescriptor> {
    const descriptor = await this.real.selectDevice(devices, savedId, logger)
    this.emulator.setDisplayDevice(descriptor)
    return descriptor
  }

  storeSelection(descriptor: DeviceDescriptor): Promise<void> {
    return this.real.storeSelection(descriptor)
  }

  async init(opts: InitOptions): Promise<OutputHandle> {
    const emulatorHandle = await this.emulator.init(opts)
    const token = process.env["SIRENO_TOKEN"] ?? ""
    const realHandle = await this.real.init({
      ...opts,
      frontendUrl: `http://127.0.0.1:5180${token.length > 0 ? `?token=${encodeURIComponent(token)}` : ""}`,
      configUiUrl: emulatorHandle.configUiUrl,
    })

    return {
      ...realHandle,
      configUiUrl: emulatorHandle.configUiUrl,
      childPids: [...emulatorHandle.childPids, ...realHandle.childPids],
      async stop(): Promise<void> {
        await Promise.allSettled([realHandle.stop(), emulatorHandle.stop()])
      },
    }
  }
}
