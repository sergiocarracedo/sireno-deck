import type pino from "pino";

import {
  isRunning,
  readChildren,
  readPid,
  readToken,
  resolveDaemonPaths,
} from "@/util/daemon.ts";

export interface StatusOptions {
  logger: pino.Logger;
}

const truncate = (s: string, maxLen = 8): string =>
  s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;

export const status = async ({ logger }: StatusOptions): Promise<void> => {
  const paths = resolveDaemonPaths();
  const pid = readPid(paths);
  const token = readToken(paths);
  const childrenState = readChildren(paths);
  const childPids = childrenState?.pids ?? [];

  if (pid === null) {
    logger.info("daemon is not running");
    return;
  }

  const alive = isRunning(pid);

  if (alive) {
    logger.info({ pid, pidFile: paths.pidFile }, "daemon is running");
  } else {
    logger.warn({ pid }, "stale pid file found");
  }

  if (token !== null) {
    logger.info({ tokenPreview: truncate(token), tokenLen: token.length }, "token present");
  } else {
    logger.warn("token file missing or empty");
  }

  if (childPids.length > 0) {
    logger.info({ count: childPids.length, pids: childPids }, "tracked children");
  } else {
    logger.info("no tracked children");
  }
};

export default status;
