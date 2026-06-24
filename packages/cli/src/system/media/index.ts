import type pino from "pino";

import { createNullMediaProvider, type MediaProvider } from "@/system/provider";

import {
  createLinuxMediaProvider,
  type CommandExecutor,
} from "@/system/media/linux";

export interface CreateMediaProviderOptions {
  readonly platform?: NodeJS.Platform;
  readonly executor?: CommandExecutor;
  readonly logger: pino.Logger;
  readonly timeoutMs?: number;
}

export const createMediaProvider = async (
  options: CreateMediaProviderOptions,
): Promise<MediaProvider> => {
  const platform = options.platform ?? process.platform;
  if (platform === "linux") {
    if (options.executor === undefined) {
      return createNullMediaProvider(options.logger);
    }
    return createLinuxMediaProvider({
      executor: options.executor,
      logger: options.logger,
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
    });
  }
  return createNullMediaProvider(options.logger);
};
