import type pino from "pino"

import { type CommandExecutor } from "@/system/providers/shared"

import {
  createNullBrightnessProvider,
  type BrightnessProvider,
  type BrightnessReading,
} from "./index"

export interface CreateLinuxBrightnessProviderOptions {
  readonly executor: CommandExecutor
  readonly env?: Readonly<Record<string, string>>
  readonly logger: pino.Logger
}

const parseXrandr = (stdout: string): BrightnessReading | null => {
  const m = stdout.match(/Brightness:\s*([\d.]+)\s*\/\s*([\d.]+)/)
  if (m === null) return null
  const current = Number.parseFloat(m[1] ?? "")
  const max = Number.parseFloat(m[2] ?? "")
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0)
    return null
  return { value: Math.round((current / max) * 100), max: 100 }
}

const parseBrightnessCtl = (stdout: string): BrightnessReading | null => {
  const v = Number.parseInt(stdout.trim(), 10)
  if (!Number.isFinite(v)) return null
  return { value: v, max: 100 }
}

export const createLinuxBrightnessProvider = (
  options: CreateLinuxBrightnessProviderOptions,
): BrightnessProvider => {
  const { executor, env, logger } = options
  const nullProvider = createNullBrightnessProvider(logger)
  let disposed = false
  const stop = async (): Promise<void> => {
    disposed = true
  }

  const getCurrent = async (): Promise<BrightnessReading> => {
    if (disposed) {
      throw new Error("Brightness provider is disposed")
    }
    const envWayland = (env ?? process.env)["WAYLAND_DISPLAY"]
    const isWayland =
      envWayland !== undefined && envWayland.length > 0 && envWayland !== "0"
    if (isWayland) {
      const r = await executor.run("brightnessctl get", [])
      if (r.exitCode === 0) {
        const parsed = parseBrightnessCtl(r.stdout)
        if (parsed !== null) return parsed
      }
    }
    const r = await executor.run("xrandr --query", [])
    if (r.exitCode !== 0) {
      const fallback = await executor.run("brightnessctl get", [])
      if (fallback.exitCode === 0) {
        const parsed = parseBrightnessCtl(fallback.stdout)
        if (parsed !== null) return parsed
      }
      logger.warn(
        { exitCode: r.exitCode, stderr: r.stderr },
        "brightness: xrandr + brightnessctl failed",
      )
      return nullProvider.getCurrent()
    }
    const parsed = parseXrandr(r.stdout)
    if (parsed === null) {
      logger.warn(
        { stdout: r.stdout.slice(0, 200) },
        "brightness: xrandr output not parseable",
      )
      return nullProvider.getCurrent()
    }
    return parsed
  }

  const setBrightness = async (value: number): Promise<void> => {
    if (disposed) throw new Error("Brightness provider is disposed")
    const clamped = Math.max(0, Math.min(100, Math.round(value)))
    const setEnvWayland = (env ?? process.env)["WAYLAND_DISPLAY"]
    const isWayland =
      setEnvWayland !== undefined &&
      setEnvWayland.length > 0 &&
      setEnvWayland !== "0"
    if (isWayland) {
      const r = await executor.run("brightnessctl set", [`${clamped}%`])
      if (r.exitCode === 0) return
      logger.warn({ stderr: r.stderr }, "brightness: brightnessctl set failed")
      return
    }
    const r = await executor.run("xrandr --output", [
      "--brightness",
      `${clamped / 100}`,
    ])
    if (r.exitCode !== 0) {
      logger.warn(
        { exitCode: r.exitCode, stderr: r.stderr },
        "brightness: xrandr --brightness failed",
      )
    }
  }

  return { getCurrent, setBrightness, stop }
}
