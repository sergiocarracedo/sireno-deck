import type pino from "pino"

import { ProviderError } from "@/system/providers/error"

import { createDarwinBrightnessProvider } from "./darwin"
import { createLinuxBrightnessProvider } from "./linux"
import { type CommandExecutor } from "@/system/providers/shared"
import { createWindowsBrightnessProvider } from "./windows"

export interface BrightnessReading {
  readonly value: number
  readonly max: number
}

export interface BrightnessProvider {
  getCurrent(): Promise<BrightnessReading>
  setBrightness(value: number): Promise<void>
  stop(): Promise<void>
}

export const createNullBrightnessProvider = (
  logger?: pino.Logger,
): BrightnessProvider => {
  if (logger) {
    logger.warn(
      { provider: "brightness" },
      "OS brightness provider unavailable, using null provider",
    )
  }
  return {
    async getCurrent(): Promise<BrightnessReading> {
      return { value: 0, max: 100 }
    },
    async setBrightness(_value: number): Promise<void> {
      throw new ProviderError(
        "NOT_AVAILABLE",
        "Brightness provider not available on this platform",
      )
    },
    async stop() {
      return
    },
  }
}

export interface CreateBrightnessProviderOptions {
  readonly executor: CommandExecutor
  readonly platform?: NodeJS.Platform
  readonly env?: Readonly<Record<string, string>>
  readonly logger: pino.Logger
}

export const createBrightnessProvider = (
  options: CreateBrightnessProviderOptions,
): BrightnessProvider => {
  const platform = options.platform ?? process.platform
  if (platform === "linux") {
    return createLinuxBrightnessProvider({
      executor: options.executor,
      env: options.env,
      logger: options.logger,
    })
  }
  if (platform === "darwin") {
    return createDarwinBrightnessProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  if (platform === "win32") {
    return createWindowsBrightnessProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  void createNullBrightnessProvider(options.logger)
  throw new ProviderError(
    "UNSUPPORTED_PLATFORM",
    `Brightness provider not implemented for platform '${platform}' in this build`,
  )
}
