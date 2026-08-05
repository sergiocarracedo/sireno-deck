import type pino from "pino"

import {
  logNull,
  noopUnsubscribe,
  type CommandExecutor,
  type LinuxDbusBus,
} from "./shared"

export interface ActiveAppSnapshot {
  name: string
  windowTitle: string | null
  processId: number | null
}

export interface ActiveAppProvider {
  getActive(): Promise<ActiveAppSnapshot | null>
  subscribe(handler: (snapshot: ActiveAppSnapshot | null) => void): () => void
  stop(): Promise<void>
}

export const createNullActiveAppProvider = (
  reason: string,
  logger?: pino.Logger,
): ActiveAppProvider => {
  logNull(logger, "active-app", reason)
  return {
    async getActive() {
      return null
    },
    subscribe() {
      return noopUnsubscribe
    },
    async stop() {
      return
    },
  }
}

export interface CreateActiveAppProviderOptions {
  readonly platform?: NodeJS.Platform
  readonly executor?: CommandExecutor
  readonly dbus?: LinuxDbusBus
  readonly logger: pino.Logger
}

export const createActiveAppProvider = async (
  options: CreateActiveAppProviderOptions,
): Promise<ActiveAppProvider> => {
  const logger = options.logger.child({ component: "active-app" })
  const platform = options.platform ?? process.platform
  if (platform === "linux") {
    if (options.executor === undefined) {
      return createNullActiveAppProvider(
        "executor-not-injected",
        options.logger,
      )
    }
    const { createLinuxActiveAppProvider } = await import("./active-app/linux")
    return createLinuxActiveAppProvider({
      executor: options.executor,
      ...(options.dbus !== undefined ? { dbus: options.dbus } : {}),
      logger: options.logger,
    })
  }
  if (platform === "darwin") {
    if (options.executor === undefined) {
      return createNullActiveAppProvider(
        "executor-not-injected",
        options.logger,
      )
    }
    const { createDarwinActiveAppProvider } =
      await import("./active-app/darwin")
    return createDarwinActiveAppProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  if (platform === "win32") {
    if (options.executor === undefined) {
      return createNullActiveAppProvider(
        "executor-not-injected",
        options.logger,
      )
    }
    const { createWindowsActiveAppProvider } =
      await import("./active-app/windows")
    return createWindowsActiveAppProvider({
      executor: options.executor,
      logger: options.logger,
    })
  }
  return createNullActiveAppProvider(
    `platform:${platform}-pending`,
    options.logger,
  )
}
