import type pino from "pino"

import {
  createNullBrightnessProvider,
  type BrightnessProvider,
  type BrightnessReading,
} from "../provider"

import type { CommandExecutor } from "../media"

export interface CreateDarwinBrightnessProviderOptions {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
}

const parseOsascript = (stdout: string): BrightnessReading | null => {
  const v = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(v)) return null
  return { value: Math.round(v * 100), max: 100 }
}

export const createDarwinBrightnessProvider = (
  options: CreateDarwinBrightnessProviderOptions,
): BrightnessProvider => {
  const { executor, logger } = options
  let disposed = false
  const stop = async (): Promise<void> => {
    disposed = true
  }

  const script =
    'tell application "System Events" to get brightness of (every item of displays)'

  const getCurrent = async (): Promise<BrightnessReading> => {
    if (disposed) throw new Error("Brightness provider is disposed")
    const r = await executor.run("osascript", ["-e", script])
    if (r.exitCode !== 0) {
      logger.warn(
        { exitCode: r.exitCode, stderr: r.stderr },
        "brightness: osascript get failed",
      )
      return createNullBrightnessProvider(logger).getCurrent()
    }
    const parsed = parseOsascript(r.stdout)
    if (parsed === null) {
      logger.warn(
        { stdout: r.stdout.slice(0, 200) },
        "brightness: osascript output not parseable",
      )
      return createNullBrightnessProvider(logger).getCurrent()
    }
    return parsed
  }

  const setBrightness = async (value: number): Promise<void> => {
    if (disposed) throw new Error("Brightness provider is disposed")
    const clamped = Math.max(0, Math.min(100, Math.round(value))) / 100
    const r = await executor.run("osascript", [
      "-e",
      `tell application "System Events" to set brightness of (every item of displays) to ${clamped}`,
    ])
    if (r.exitCode !== 0) {
      logger.warn(
        { exitCode: r.exitCode, stderr: r.stderr },
        "brightness: osascript set failed",
      )
    }
  }

  return { getCurrent, setBrightness, stop }
}
