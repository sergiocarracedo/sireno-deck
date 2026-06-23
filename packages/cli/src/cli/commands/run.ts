import type pino from "pino";

export interface RunOptions {
  config?: string;
  port?: number;
  emulator?: boolean;
  dev?: boolean;
  deviceModel?: string;
  logLevel?: string;
  logger: pino.Logger;
}

export const run = async (options: RunOptions): Promise<void> => {
  const { logger } = options;
  logger.warn("run command is a Phase 0 placeholder — full implementation lands in later phases");
  logger.info({ options }, "received options");
};
