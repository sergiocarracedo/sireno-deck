import type pino from "pino";

import type { RunOptions } from "./run";

export interface StartOptions {
  config?: string;
  port?: number;
  emulator?: boolean;
  deviceModel?: string;
  logger: pino.Logger;
}

const start = async (options: StartOptions): Promise<void> => {
  const { logger } = options;
  logger.warn(
    { options },
    "start command is a Phase 0 placeholder — full implementation lands in Phase 9",
  );
  await import("./run").then((m) => m.run({ ...(options as RunOptions), logger }));
};

export default start;
