import type pino from "pino";

import type { CommandExecutor } from "../media";

import { createLinuxClipboardProvider } from "./linux.ts";
import { createDarwinClipboardProvider } from "./darwin.ts";
import { createWindowsClipboardProvider } from "./windows.ts";
import { createNullClipboardProvider, type ClipboardProvider, ProviderError } from "../provider.ts";

export { createNullClipboardProvider };
export type { ClipboardProvider } from "../provider.ts";

export interface CreateClipboardProviderOptions {
  readonly executor: CommandExecutor;
  readonly platform?: NodeJS.Platform;
  readonly env?: Readonly<Record<string, string>>;
  readonly logger: pino.Logger;
}

export const createClipboardProvider = (
  options: CreateClipboardProviderOptions,
): ClipboardProvider => {
  const platform = options.platform ?? process.platform;
  if (platform === "linux") {
    return createLinuxClipboardProvider({
      executor: options.executor,
      env: options.env,
      logger: options.logger,
    });
  }
  if (platform === "darwin") {
    return createDarwinClipboardProvider({
      executor: options.executor,
      logger: options.logger,
    });
  }
  if (platform === "win32") {
    return createWindowsClipboardProvider({
      executor: options.executor,
      logger: options.logger,
    });
  }
  void createNullClipboardProvider(options.logger);
  throw new ProviderError(
    "UNSUPPORTED_PLATFORM",
    `Clipboard provider not implemented for platform '${platform}' in this build`,
  );
};
