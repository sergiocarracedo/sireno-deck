import type { StreamDeckDevice } from "@/device/stream-deck"

import { EmulatorOutputClient } from "./emulator"
import { RealOutputClient } from "./real"
import type { OutputClient } from "./types"

export interface SelectOutputClientOptions {
  readonly emulator: boolean
  readonly device: StreamDeckDevice | null
  readonly intervalMs?: number
}

export const selectOutputClient = (
  options: SelectOutputClientOptions,
): OutputClient => {
  if (options.emulator) return new EmulatorOutputClient()
  if (options.device === null) {
    throw new Error("selectOutputClient: device required for real mode")
  }
  return new RealOutputClient({
    device: options.device,
    ...(options.intervalMs !== undefined
      ? { intervalMs: options.intervalMs }
      : {}),
  })
}

export type {
  OutputClient,
  OutputContext,
  OutputHandle,
  RealOutputClientDeps,
} from "./types"
export { EmulatorOutputClient } from "./emulator"
export { RealOutputClient } from "./real"
