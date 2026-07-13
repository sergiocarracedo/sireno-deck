import type pino from "pino"

import { ProviderError } from "./error"
import { type CommandExecutor } from "./shared"

export interface KeyMacroProvider {
  sendKey(comboOrText: string): Promise<void>
  stop(): Promise<void>
}

export { isValidKey, knownKeys, parseCombo } from "./key-macro/parser"
export type { ParsedCombo } from "./key-macro/parser"

export const createNullKeyMacroProvider = (
  logger?: pino.Logger,
): KeyMacroProvider => {
  if (logger) {
    logger.warn(
      { provider: "key-macro" },
      "OS key-macro provider unavailable, sendKey will throw ProviderError",
    )
  }
  return {
    async sendKey(_comboOrText: string): Promise<void> {
      throw new ProviderError(
        "NOT_AVAILABLE",
        "Key-macro provider not available on this platform",
      )
    },
    async stop() {
      return
    },
  }
}

export interface CreateKeyMacroProviderOptions {
  readonly platform?: NodeJS.Platform
  readonly executor: CommandExecutor
  readonly env: Readonly<Record<string, string>>
  readonly logger: pino.Logger
}

export const createKeyMacroProvider = async (
  options: CreateKeyMacroProviderOptions,
): Promise<KeyMacroProvider> => {
  const platform = options.platform ?? process.platform
  if (platform === "linux") {
    const { createLinuxKeyMacroProvider } = await import("./key-macro/linux")
    return createLinuxKeyMacroProvider({
      executor: options.executor,
      env: options.env,
      logger: options.logger,
    })
  }
  if (platform === "darwin") {
    const { createDarwinKeyMacroProvider } = await import("./key-macro/darwin")
    return createDarwinKeyMacroProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  if (platform === "win32") {
    const { createWindowsKeyMacroProvider } =
      await import("./key-macro/windows")
    return createWindowsKeyMacroProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  void createNullKeyMacroProvider(options.logger)
  throw new ProviderError(
    "UNSUPPORTED_PLATFORM",
    `Key-macro provider not implemented for platform '${platform}' in this build`,
  )
}
