import type pino from "pino";

import { createNullActiveAppProvider, type ActiveAppProvider } from "@/system/provider";

import { createLinuxActiveAppProvider, type CommandExecutor } from "@/system/active-app/linux";

import { createDarwinActiveAppProvider } from "@/system/active-app/darwin";
import { createWindowsActiveAppProvider } from "@/system/active-app/windows";

export interface CreateActiveAppProviderOptions {
  readonly platform?: NodeJS.Platform;
  readonly executor?: CommandExecutor;
  readonly dbus?: unknown;
  readonly logger: pino.Logger;
}

export const createActiveAppProvider = async (
  options: CreateActiveAppProviderOptions,
): Promise<ActiveAppProvider> => {
  const platform = options.platform ?? process.platform;
  if (platform === "linux") {
    if (options.executor === undefined) {
      return createNullActiveAppProvider("executor-not-injected", options.logger);
    }
    return createLinuxActiveAppProvider({
      executor: options.executor,
      ...(options.dbus !== undefined ? { dbus: options.dbus as never } : {}),
      logger: options.logger,
    });
  }
  if (platform === "darwin") {
    if (options.executor === undefined) {
      return createNullActiveAppProvider("executor-not-injected", options.logger);
    }
    return createDarwinActiveAppProvider({
      executor: options.executor,
      logger: options.logger,
    });
  }
  if (platform === "win32") {
    if (options.executor === undefined) {
      return createNullActiveAppProvider("executor-not-injected", options.logger);
    }
    return createWindowsActiveAppProvider({
      executor: options.executor,
      logger: options.logger,
    });
  }
  return createNullActiveAppProvider(`platform:${platform}-pending`, options.logger);
};
