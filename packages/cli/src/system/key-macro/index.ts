import type pino from "pino"

import {
  createNullKeyMacroProvider,
  type KeyMacroProvider,
  ProviderError,
} from "@/system/provider"

import {
  createLinuxKeyMacroProvider,
  type CommandExecutor,
} from "@/system/key-macro/linux"

import { createDarwinKeyMacroProvider } from "@/system/key-macro/darwin"

import { createWindowsKeyMacroProvider } from "@/system/key-macro/windows"

export { isValidKey, knownKeys, parseCombo } from "./parser"
export type { ParsedCombo } from "./parser"

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
    return createLinuxKeyMacroProvider({
      executor: options.executor,
      env: options.env,
      logger: options.logger,
    })
  }
  if (platform === "darwin") {
    return createDarwinKeyMacroProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  if (platform === "win32") {
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
