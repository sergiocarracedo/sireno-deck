import type pino from "pino"

import { ProviderError } from "./error"
import { logNull, type CommandExecutor } from "./shared"

export interface NotificationArgs {
  readonly title: string
  readonly body: string
  readonly sound?: boolean
}

export interface NotificationProvider {
  notify(args: NotificationArgs): Promise<void>
}

export interface CreateNotificationProviderOptions {
  readonly platform?: NodeJS.Platform
  readonly executor: CommandExecutor
  readonly env: Readonly<Record<string, string>>
  readonly logger: pino.Logger
  readonly extraFsProbe?: (tool: string) => boolean
  readonly soundPath?: string
}

export const createNullNotificationProvider = (
  logger?: pino.Logger,
): NotificationProvider => {
  logNull(
    logger,
    "notification",
    "platform unsupported, notify() is a no-op",
  )
  return {
    async notify() {
      return
    },
  }
}

export const createNotificationProvider = async (
  options: CreateNotificationProviderOptions,
): Promise<NotificationProvider> => {
  const platform = options.platform ?? process.platform
  if (platform === "linux") {
    const { createLinuxNotificationProvider } =
      await import("./notification/linux")
    return createLinuxNotificationProvider({
      executor: options.executor,
      logger: options.logger,
      ...(options.extraFsProbe !== undefined
        ? { extraFsProbe: options.extraFsProbe }
        : {}),
      ...(options.soundPath !== undefined ? { soundPath: options.soundPath } : {}),
    })
  }
  if (platform === "darwin") {
    const { createDarwinNotificationProvider } =
      await import("./notification/darwin")
    return createDarwinNotificationProvider({
      executor: options.executor,
      ...(options.soundPath !== undefined ? { soundPath: options.soundPath } : {}),
    })
  }
  if (platform === "win32") {
    const { createWindowsNotificationProvider } =
      await import("./notification/windows")
    return createWindowsNotificationProvider({
      executor: options.executor,
      logger: options.logger,
      ...(options.soundPath !== undefined ? { soundPath: options.soundPath } : {}),
    })
  }
  return createNullNotificationProvider(options.logger)
}