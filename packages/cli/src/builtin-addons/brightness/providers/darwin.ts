import type pino from "pino"

import { type CommandExecutor } from "@/system/providers/shared"

import {
  createNullBrightnessProvider,
  type BrightnessProvider,
  type BrightnessReading,
} from "./index"

export interface CreateDarwinBrightnessProviderOptions {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
}

// ponytail: this provider used to shell out to
// `tell application "System Events" to get brightness of (every item of
// displays)`. System Events has no `displays` element, so every call failed
// with "The variable displays is not defined (-2753)" and brightness has never
// worked on macOS. There is no public CLI or ioreg node for display brightness
// on Apple Silicon (it moved into the private DisplayServices framework), so
// the honest options are the `brightness` Homebrew binary or nothing.
//
// `brightness -l` prints one "display N: brightness 0.550000" line per display;
// `brightness <0..1>` sets every display. Values are 0..1 on the wire and
// 0..100 across the BrightnessProvider interface.
const BRIGHTNESS_BIN = "brightness"
const INSTALL_HINT = "install it with `brew install brightness`"

const BRIGHTNESS_LINE = /display\s+\d+:\s+brightness\s+([0-9]*\.?[0-9]+)/i

export const parseBrightnessList = (
  stdout: string,
): BrightnessReading | null => {
  const match = BRIGHTNESS_LINE.exec(stdout)
  if (match?.[1] === undefined) return null
  const fraction = Number.parseFloat(match[1])
  if (!Number.isFinite(fraction)) return null
  const clamped = Math.max(0, Math.min(1, fraction))
  return { value: Math.round(clamped * 100), max: 100 }
}

export const createDarwinBrightnessProvider = (
  options: CreateDarwinBrightnessProviderOptions,
): BrightnessProvider => {
  const { executor, logger } = options
  const nullProvider = createNullBrightnessProvider(logger)
  let disposed = false
  // Warn once, not on every poll tick.
  let warnedMissing = false

  const warnMissing = (detail: string): void => {
    if (warnedMissing) return
    warnedMissing = true
    logger.warn(
      { bin: BRIGHTNESS_BIN, detail },
      `brightness: '${BRIGHTNESS_BIN}' unavailable — ${INSTALL_HINT}`,
    )
  }

  const stop = async (): Promise<void> => {
    disposed = true
  }

  const getCurrent = async (): Promise<BrightnessReading> => {
    if (disposed) throw new Error("Brightness provider is disposed")
    let result
    try {
      result = await executor.run(BRIGHTNESS_BIN, ["-l"], { timeoutMs: 2_000 })
    } catch (err) {
      warnMissing((err as Error).message)
      return nullProvider.getCurrent()
    }
    if (result.exitCode !== 0) {
      warnMissing(result.stderr.trim() || `exit ${result.exitCode}`)
      return nullProvider.getCurrent()
    }
    const parsed = parseBrightnessList(result.stdout)
    if (parsed === null) {
      logger.warn(
        { stdout: result.stdout.slice(0, 200) },
        "brightness: could not parse `brightness -l` output",
      )
      return nullProvider.getCurrent()
    }
    return parsed
  }

  const setBrightness = async (value: number): Promise<void> => {
    if (disposed) throw new Error("Brightness provider is disposed")
    const fraction = Math.max(0, Math.min(100, Math.round(value))) / 100
    let result
    try {
      result = await executor.run(BRIGHTNESS_BIN, [fraction.toFixed(3)], {
        timeoutMs: 2_000,
      })
    } catch (err) {
      warnMissing((err as Error).message)
      return
    }
    if (result.exitCode !== 0) {
      warnMissing(result.stderr.trim() || `exit ${result.exitCode}`)
    }
  }

  return { getCurrent, setBrightness, stop }
}
