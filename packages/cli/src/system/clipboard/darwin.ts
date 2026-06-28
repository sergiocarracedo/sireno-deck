import type pino from "pino";

import { type ClipboardProvider } from "../provider.ts";

import type { CommandExecutor } from "../media";

export interface CreateDarwinClipboardProviderOptions {
  readonly executor: CommandExecutor;
  readonly logger: pino.Logger;
}

export const createDarwinClipboardProvider = (
  options: CreateDarwinClipboardProviderOptions,
): ClipboardProvider => {
  const { executor, logger } = options;
  let disposed = false;
  const stop = async (): Promise<void> => {
    disposed = true;
  };

  const writeText = async (text: string): Promise<void> => {
    if (disposed) throw new Error("Clipboard provider is disposed");
    const escaped = text.replace(/'/g, "'\\''");
    const r = await executor.run("sh", ["-c", `printf '%s' '${escaped}' | pbcopy`]);
    if (r.exitCode !== 0) {
      logger.warn({ stderr: r.stderr }, "clipboard: pbcopy failed");
    }
  };

  const readText = async (): Promise<string> => {
    if (disposed) throw new Error("Clipboard provider is disposed");
    const r = await executor.run("sh", ["-c", "pbpaste"]);
    if (r.exitCode === 0 && r.stdout.length > 0) return r.stdout;
    return "";
  };

  return { writeText, readText, stop };
};
