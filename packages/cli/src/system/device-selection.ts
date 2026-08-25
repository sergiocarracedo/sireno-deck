import { select as clackSelect } from "@/cli/prompt"
import type pino from "pino"

import type { DeviceDescriptor } from "@/device/registry"
import type { DeviceConfig } from "@/util/device-config"

export class NoStreamDeckFoundError extends Error {
  constructor() {
    super("No Stream Deck devices found")
    this.name = "NoStreamDeckFoundError"
  }
}

export interface SelectDeviceResult {
  readonly descriptor: DeviceDescriptor
  readonly savedButStale: boolean
}

export interface SelectDeviceOptions {
  readonly devices: ReadonlyArray<DeviceDescriptor>
  readonly current?: DeviceConfig | null
  readonly logger: pino.Logger
}

const formatChoice = (
  descriptor: DeviceDescriptor,
  hint: string | undefined,
): { label: string; value: string; hint?: string } => ({
  label: descriptor.label,
  value: descriptor.id,
  ...(hint !== undefined ? { hint } : {}),
})

export const selectDevice = async (
  options: SelectDeviceOptions,
): Promise<SelectDeviceResult> => {
  if (options.devices.length === 0) {
    throw new NoStreamDeckFoundError()
  }
  if (options.devices.length === 1) {
    return { descriptor: options.devices[0]!, savedButStale: false }
  }

  const currentMatches = options.current
    ? options.devices.find((d) => d.id === options.current!.serial) !==
      undefined
    : false
  if (options.current && currentMatches) {
    const match = options.devices.find((d) => d.id === options.current!.serial)!
    options.logger.debug({ id: match.id }, "using saved device selection")
    return { descriptor: match, savedButStale: false }
  }

  const savedButStale =
    options.current !== null && options.current !== undefined && !currentMatches
  const choices = options.devices.map((d) =>
    formatChoice(
      d,
      savedButStale && d.id === options.current!.serial
        ? "(saved, disconnected)"
        : undefined,
    ),
  )
  choices.sort((a, b) => {
    const aStale = a.hint === "(saved, disconnected)"
    const bStale = b.hint === "(saved, disconnected)"
    if (aStale && !bStale) return -1
    if (bStale && !aStale) return 1
    return 0
  })

  const selected = await clackSelect({
    message: "Select a Stream Deck:",
    options: choices,
  })

  const descriptor = options.devices.find((d) => d.id === selected)
  if (!descriptor) throw new NoStreamDeckFoundError()
  return { descriptor, savedButStale }
}
