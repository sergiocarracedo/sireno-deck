import type pino from "pino";

import { createNullSessionProvider, type SessionProvider } from "@/system/provider";

import {
  createLinuxSessionProvider,
  type LinuxDbusBus,
} from "@/system/session-monitor/linux";

export interface CreateSessionProviderOptions {
  readonly platform?: NodeJS.Platform;
  readonly dbus?: LinuxDbusBus;
  readonly logger: pino.Logger;
  readonly idleMs?: number;
}

export const createSessionProvider = async (
  options: CreateSessionProviderOptions,
): Promise<SessionProvider> => {
  const platform = options.platform ?? process.platform;
  if (platform === "linux") {
    if (options.dbus === undefined) {
      return createNullSessionProvider(options.logger);
    }
    return createLinuxSessionProvider({
      dbus: options.dbus,
      logger: options.logger,
      ...(options.idleMs !== undefined ? { idleMs: options.idleMs } : {}),
    });
  }
  return createNullSessionProvider(options.logger);
};
