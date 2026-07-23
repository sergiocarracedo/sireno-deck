import type pino from "pino"

import { ProviderError } from "./error"

import { createDarwinClipboardProvider } from "./clipboard/darwin"
import { createLinuxClipboardProvider } from "./clipboard/linux"
import { createWindowsClipboardProvider } from "./clipboard/windows"
import { type CommandExecutor } from "./shared"

export interface ClipboardProvider {
  writeText(text: string): Promise<void>
  readText(): Promise<string>
  stop(): Promise<void>
}

export const createNullClipboardProvider = (
  logger?: pino.Logger,
): ClipboardProvider => {
  if (logger) {
    logger.warn(
      { provider: "clipboard" },
      "OS clipboard provider unavailable, using null provider",
    )
  }
  return {
    async writeText(_text: string): Promise<void> {
      throw new ProviderError(
        "NOT_AVAILABLE",
        "Clipboard provider not available on this platform",
      )
    },
    async readText(): Promise<string> {
      throw new ProviderError(
        "NOT_AVAILABLE",
        "Clipboard provider not available on this platform",
      )
    },
    async stop() {
      return
    },
  }
}

export interface CreateClipboardProviderOptions {
  readonly executor: CommandExecutor
  readonly platform?: NodeJS.Platform
  readonly env?: Readonly<Record<string, string>>
  readonly logger: pino.Logger
  readonly extraFsProbe?: (tool: string) => boolean
}

export const createClipboardProvider = (
  options: CreateClipboardProviderOptions,
): ClipboardProvider => {
  const platform = options.platform ?? process.platform
  if (platform === "linux") {
    return createLinuxClipboardProvider({
      executor: options.executor,
      ...(options.env !== undefined ? { env: options.env } : {}),
      logger: options.logger,
      ...(options.extraFsProbe !== undefined
        ? { extraFsProbe: options.extraFsProbe }
        : {}),
    })
  }
  if (platform === "darwin") {
    return createDarwinClipboardProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  if (platform === "win32") {
    return createWindowsClipboardProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  void createNullClipboardProvider(options.logger)
  throw new ProviderError(
    "UNSUPPORTED_PLATFORM",
    `Clipboard provider not implemented for platform '${platform}' in this build`,
  )
}
