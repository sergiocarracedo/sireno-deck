import type pino from "pino";

import {
  createNullBrightnessProvider,
  type BrightnessProvider,
  type BrightnessReading,
} from "../provider.ts";

import type { CommandExecutor } from "../media";

export interface CreateWindowsBrightnessProviderOptions {
  readonly executor: CommandExecutor;
  readonly logger: pino.Logger;
}

const parseWmi = (stdout: string): BrightnessReading | null => {
  const v = Number.parseInt(stdout.trim(), 10);
  if (!Number.isFinite(v)) return null;
  return { value: v, max: 100 };
};

export const createWindowsBrightnessProvider = (
  options: CreateWindowsBrightnessProviderOptions,
): BrightnessProvider => {
  const { executor, logger } = options;
  let disposed = false;
  const stop = async (): Promise<void> => {
    disposed = true;
  };

  const getCommand =
    "(Get-WmiObject -Namespace root/WMI -ClassName WmiMonitorBrightness).CurrentBrightness";

  const getCurrent = async (): Promise<BrightnessReading> => {
    if (disposed) throw new Error("Brightness provider is disposed");
    const r = await executor.run("powershell", [
      "-NoProfile",
      "-Command",
      getCommand,
    ]);
    if (r.exitCode !== 0) {
      logger.warn({ exitCode: r.exitCode, stderr: r.stderr }, "brightness: powershell get failed");
      return createNullBrightnessProvider(logger).getCurrent();
    }
    const parsed = parseWmi(r.stdout);
    if (parsed === null) {
      logger.warn({ stdout: r.stdout.slice(0, 200) }, "brightness: powershell output not parseable");
      return createNullBrightnessProvider(logger).getCurrent();
    }
    return parsed;
  };

  const setBrightness = async (value: number): Promise<void> => {
    if (disposed) throw new Error("Brightness provider is disposed");
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const r = await executor.run("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-WmiObject -Namespace root/WMI -ClassName WmiMonitorBrightness).CurrentBrightness = ${clamped}`,
    ]);
    if (r.exitCode !== 0) {
      logger.warn({ exitCode: r.exitCode, stderr: r.stderr }, "brightness: powershell set failed");
    }
  };

  return { getCurrent, setBrightness, stop };
};
