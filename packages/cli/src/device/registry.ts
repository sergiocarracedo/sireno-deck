import type { StreamDeckLogger } from "./stream-deck"
import type { StreamDeckDeviceHandle } from "./stream-deck"

let openHandles: Set<StreamDeckDeviceHandle> = new Set()
let currentBrightness = 50

export function registerDeviceHandle(handle: StreamDeckDeviceHandle): void {
  openHandles.add(handle)
}

export function unregisterDeviceHandle(handle: StreamDeckDeviceHandle): void {
  openHandles.delete(handle)
}

export function getOpenDeviceHandles(): readonly StreamDeckDeviceHandle[] {
  return [...openHandles]
}

export function getCurrentBrightness(): number {
  return currentBrightness
}

export function _resetDeviceRegistryForTests(): void {
  openHandles = new Set()
  currentBrightness = 50
}

export interface SetBrightnessResult {
  succeeded: number
  failed: number
  errors: string[]
}

export async function setBrightnessAll(
  percentage: number,
  logger?: StreamDeckLogger,
): Promise<SetBrightnessResult> {
  const result: SetBrightnessResult = { succeeded: 0, failed: 0, errors: [] }
  for (const handle of getOpenDeviceHandles()) {
    try {
      await handle.setBrightness(percentage)
      result.succeeded += 1
    } catch (error) {
      result.failed += 1
      const message = error instanceof Error ? error.message : String(error)
      result.errors.push(message)
      logger?.warn({ error, percentage }, "setBrightnessAll: device failed")
    }
  }
  currentBrightness = percentage
  return result
}
