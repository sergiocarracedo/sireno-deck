import type pino from "pino";

import { removePidFile, writePid } from "@/util/daemon";

import { preflight, runRealModePipeline, type RunOptions, type SignalProvider } from "./run";

export interface StartOptions {
  readonly config?: string;
  readonly port?: number;
  readonly emulator?: boolean;
  readonly deviceModel?: string;
  readonly frontendUrl?: string;
  readonly intervalMs?: number;
  readonly xdgConfigHome?: string;
  readonly homeDir?: string;
  readonly signals?: SignalProvider;
  readonly logger: pino.Logger;
}

const toRunOptions = (options: StartOptions): RunOptions => ({
  logger: options.logger,
  ...(options.config !== undefined ? { config: options.config } : {}),
  ...(options.port !== undefined ? { port: options.port } : {}),
  ...(options.emulator !== undefined ? { emulator: options.emulator } : {}),
  ...(options.deviceModel !== undefined ? { deviceModel: options.deviceModel } : {}),
  ...(options.frontendUrl !== undefined ? { frontendUrl: options.frontendUrl } : {}),
  ...(options.intervalMs !== undefined ? { intervalMs: options.intervalMs } : {}),
  ...(options.xdgConfigHome !== undefined ? { xdgConfigHome: options.xdgConfigHome } : {}),
  ...(options.homeDir !== undefined ? { homeDir: options.homeDir } : {}),
  ...(options.signals !== undefined ? { signals: options.signals } : {}),
});

const start = async (options: StartOptions): Promise<void> => {
  const runOptions = toRunOptions(options);

  await preflight(runOptions);

  writePid(process.pid);

  void runRealModePipeline(runOptions)
    .catch((err: unknown) => {
      options.logger.error({ err }, "background run failed");
    })
    .finally(() => {
      removePidFile();
    });
};

export default start;
