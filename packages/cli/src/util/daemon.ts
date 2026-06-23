import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { platform } from "node:process";

import type pino from "pino";

export interface DaemonPaths {
  runtimeDir: string;
  pidFile: string;
}

const DAEMON_NAME = "sireno-deck-2";

const defaultRuntimeDir = (): string => {
  const xdg = process.env["XDG_RUNTIME_DIR"];
  if (xdg) return xdg;

  switch (platform) {
    case "darwin":
      return join(homedir(), "Library", "Application Support", DAEMON_NAME);
    case "win32":
      return join(process.env["LOCALAPPDATA"] ?? tmpdir(), DAEMON_NAME);
    default:
      return tmpdir();
  }
};

export const resolveDaemonPaths = (): DaemonPaths => {
  const runtimeDir = defaultRuntimeDir();
  if (!existsSync(runtimeDir)) {
    mkdirSync(runtimeDir, { recursive: true });
  }
  return {
    runtimeDir,
    pidFile: join(runtimeDir, `${DAEMON_NAME}.pid`),
  };
};

export const readPid = (paths = resolveDaemonPaths()): number | null => {
  if (!existsSync(paths.pidFile)) return null;
  const raw = readFileSync(paths.pidFile, "utf8").trim();
  const pid = Number.parseInt(raw, 10);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
};

export const writePid = (pid: number, paths = resolveDaemonPaths()): void => {
  writeFileSync(paths.pidFile, `${pid}\n`, { encoding: "utf8" });
};

export const removePidFile = (paths = resolveDaemonPaths()): void => {
  if (existsSync(paths.pidFile)) unlinkSync(paths.pidFile);
};

export const isRunning = (pid: number): boolean => {
  if (pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

export interface StartDaemonOptions {
  logger: pino.Logger;
  dryRun?: boolean;
}

export const startDaemon = ({
  logger,
  dryRun = false,
}: StartDaemonOptions): { pid: number; pidFile: string } => {
  const paths = resolveDaemonPaths();
  const existing = readPid(paths);
  if (existing !== null && isRunning(existing)) {
    throw new Error(`Daemon already running with pid ${existing}`);
  }
  if (existing !== null) {
    logger.warn({ pid: existing }, "removing stale pid file");
    removePidFile(paths);
  }
  const pid = process.pid;
  if (!dryRun) writePid(pid, paths);
  logger.info({ pid, pidFile: paths.pidFile }, "daemon started");
  return { pid, pidFile: paths.pidFile };
};

export interface StopDaemonOptions {
  logger: pino.Logger;
}

export const stopDaemon = ({ logger }: StopDaemonOptions): void => {
  const paths = resolveDaemonPaths();
  const pid = readPid(paths);
  if (pid === null) {
    logger.info("no running daemon found");
    return;
  }
  if (!isRunning(pid)) {
    logger.warn({ pid }, "stale pid file found");
    removePidFile(paths);
    return;
  }
  logger.info({ pid }, "stopping daemon");
  process.kill(pid, "SIGTERM");
};

export interface CheckStatusOptions {
  logger: pino.Logger;
}

export const checkStatus = ({ logger }: CheckStatusOptions): void => {
  const paths = resolveDaemonPaths();
  const pid = readPid(paths);
  if (pid === null) {
    logger.info("daemon is not running");
    return;
  }
  if (isRunning(pid)) {
    logger.info({ pid, pidFile: paths.pidFile }, "daemon is running");
    return;
  }
  logger.warn({ pid }, "stale pid file found");
  removePidFile(paths);
};
