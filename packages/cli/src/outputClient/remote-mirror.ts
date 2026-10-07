import type pino from "pino"

import type { DeviceDescriptor } from "@/device/registry"

import { EmulatorOutputClient } from "./emulator"
import { RealOutputClient } from "./real"
import type { InitOptions, OutputClient, OutputHandle } from "./types"

/** Runs the physical deck and remote emulator against one runtime. */
export class RemoteMirrorOutputClient implements OutputClient {
  private readonly real: RealOutputClient
  private readonly emulator = new EmulatorOutputClient()
  private hardwareSelected = false

  get kind(): "real" | "emulator" {
    return this.hardwareSelected ? "real" : "emulator"
  }

  constructor(options: { readonly xdgConfigHome: string }) {
    this.real = new RealOutputClient(options)
  }

  validateReady(): Promise<void> {
    return this.real.validateReady()
  }

  listDevices(): Promise<ReadonlyArray<DeviceDescriptor>> {
    return this.real.listDevices().then(async (devices) => {
      if (devices.length > 0) {
        this.hardwareSelected = true
        return devices
      }
      this.hardwareSelected = false
      return this.emulator.listDevices()
    })
  }

  async selectDevice(
    devices: ReadonlyArray<DeviceDescriptor>,
    savedId: string | null,
    logger: pino.Logger,
  ): Promise<DeviceDescriptor> {
    if (!this.hardwareSelected) {
      return this.emulator.selectDevice(devices, savedId, logger)
    }
    const descriptor = await this.real.selectDevice(devices, savedId, logger)
    this.emulator.setDisplayDevice(descriptor)
    return descriptor
  }

  storeSelection(descriptor: DeviceDescriptor): Promise<void> {
    return this.hardwareSelected
      ? this.real.storeSelection(descriptor)
      : Promise.resolve()
  }

  async init(opts: InitOptions): Promise<OutputHandle> {
    if (!this.hardwareSelected) return this.emulator.init(opts)

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
