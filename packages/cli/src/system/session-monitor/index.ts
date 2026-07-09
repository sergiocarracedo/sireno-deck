import type pino from "pino"

import {
  createNullSessionProvider,
  type SessionProvider,
} from "@/system/provider"

import {
  createLinuxSessionProvider,
  type LinuxDbusBus,
} from "@/system/session-monitor/linux"

import {
  createDarwinSessionProvider,
  type CommandExecutor,
} from "@/system/session-monitor/darwin"

import { createWindowsSessionProvider } from "@/system/session-monitor/windows"

export interface CreateSessionProviderOptions {
  readonly platform?: NodeJS.Platform
  readonly dbus?: LinuxDbusBus
  readonly executor?: CommandExecutor
  readonly logger: pino.Logger
  readonly idleMs?: number
}

export const createSessionProvider = async (
  options: CreateSessionProviderOptions,
): Promise<SessionProvider> => {
  const platform = options.platform ?? process.platform
  if (platform === "linux") {
    if (options.dbus === undefined) {
      return createNullSessionProvider(options.logger)
    }
    return createLinuxSessionProvider({
      dbus: options.dbus,
      logger: options.logger,
      ...(options.idleMs !== undefined ? { idleMs: options.idleMs } : {}),
    })
  }
  if (platform === "darwin") {
    if (options.executor === undefined) {
      return createNullSessionProvider(options.logger)
    }
    return createDarwinSessionProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  if (platform === "win32") {
    if (options.executor === undefined) {
      return createNullSessionProvider(options.logger)
    }
    return createWindowsSessionProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  return createNullSessionProvider(options.logger)
}
