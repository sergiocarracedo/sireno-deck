import type pino from "pino"

import { noopUnsubscribe } from "./shared"

export type SessionState = "locked" | "unlocked" | "unknown"

export interface SessionProvider {
  getState(): SessionState
  subscribe(handler: (state: SessionState) => void): () => void
  stop(): Promise<void>
}

export const createNullSessionProvider = (
  logger?: pino.Logger,
): SessionProvider => {
  if (logger) {
    logger.warn(
      { provider: "session" },
      "OS session provider unavailable, using null provider",
    )
  }
  return {
    getState() {
      return "unknown"
    },
    subscribe() {
      return noopUnsubscribe
    },
    async stop() {
      return
    },
  }
}

export interface CreateSessionProviderOptions {
  readonly platform?: NodeJS.Platform
  readonly dbus?: import("./shared").LinuxDbusBus
  readonly executor?: import("./shared").CommandExecutor
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
    const { createLinuxSessionProvider } = await import("./session/linux")
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
    const { createDarwinSessionProvider } = await import("./session/darwin")
    return createDarwinSessionProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  if (platform === "win32") {
    if (options.executor === undefined) {
      return createNullSessionProvider(options.logger)
    }
    const { createWindowsSessionProvider } = await import("./session/windows")
    return createWindowsSessionProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  return createNullSessionProvider(options.logger)
}
