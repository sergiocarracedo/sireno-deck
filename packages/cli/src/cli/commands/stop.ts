import type pino from "pino";

import {
  isRunning,
  readChildren,
  readPid,
  removeChildrenFile,
  removePidFile,
  removeTokenFile,
} from "@/util/daemon.ts";

export interface StopOptions {
  logger: pino.Logger;
}

const killGracefully = async (
  pid: number,
  logger: pino.Logger,
  label: string,
): Promise<void> => {
  if (!isRunning(pid)) {
    logger.debug({ pid, label }, "stop: already exited");
    return;
  }
  logger.info({ pid, label }, "stop: SIGTERM");
  try {
    process.kill(pid, "SIGTERM");
  } catch (err) {
    logger.warn({ err, pid, label }, "stop: SIGTERM failed");
    return;
  }
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline && isRunning(pid)) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (isRunning(pid)) {
    logger.warn({ pid, label }, "stop: did not exit in 5s, sending SIGKILL");
    try {
      process.kill(pid, "SIGKILL");
    } catch (err) {
      logger.warn({ err, pid, label }, "stop: SIGKILL failed");
    }
  }
};

export const stop = async ({ logger }: StopOptions): Promise<void> => {
  const pid = readPid();
  if (pid === null) {
    logger.info("stop: no running daemon found");
    return;
  }

  const childrenState = readChildren();
  const childPids = childrenState?.pids ?? [];

  for (const childPid of childPids) {
    await killGracefully(childPid, logger, `child`);
  }

  await killGracefully(pid, logger, "daemon");

  removePidFile();
  removeTokenFile();
  removeChildrenFile();
  logger.info("stop: cleanup complete");
};

export default stop;
