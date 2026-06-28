import type pino from "pino";

import { type ClipboardProvider } from "../provider.ts";

import type { CommandExecutor } from "../media";

export interface CreateWindowsClipboardProviderOptions {
  readonly executor: CommandExecutor;
  readonly logger: pino.Logger;
}

export const createWindowsClipboardProvider = (
  options: CreateWindowsClipboardProviderOptions,
): ClipboardProvider => {
  const { executor, logger } = options;
  let disposed = false;
  const stop = async (): Promise<void> => {
    disposed = true;
  };

  const writeText = async (text: string): Promise<void> => {
    if (disposed) throw new Error("Clipboard provider is disposed");
    const r = await executor.run("powershell", [
      "-NoProfile",
      "-Command",
      `Set-Clipboard -Value '${text.replace(/'/g, "''")}'`,
    ]);
    if (r.exitCode !== 0) {
      logger.warn({ stderr: r.stderr }, "clipboard: Set-Clipboard failed");
    }
  };

  const readText = async (): Promise<string> => {
    if (disposed) throw new Error("Clipboard provider is disposed");
    const r = await executor.run("powershell", [
      "-NoProfile",
      "-Command",
      "Get-Clipboard",
    ]);
    if (r.exitCode === 0 && r.stdout.length > 0) return r.stdout;
    return "";
  };

  return { writeText, readText, stop };
};
