import type pino from "pino";

import type { CommandExecutor } from "@/system/media";

import { createLinuxBrightnessProvider } from "./linux.ts";
import { createDarwinBrightnessProvider } from "./darwin.ts";
import { createWindowsBrightnessProvider } from "./windows.ts";
import { createNullBrightnessProvider } from "../provider.ts";
import { ProviderError, type BrightnessProvider } from "../provider.ts";

export { createNullBrightnessProvider };
export type { BrightnessProvider, BrightnessReading } from "../provider.ts";

export interface CreateBrightnessProviderOptions {
  readonly executor: CommandExecutor;
  readonly platform?: NodeJS.Platform;
  readonly env?: Readonly<Record<string, string>>;
  readonly logger: pino.Logger;
}

export const createBrightnessProvider = (
  options: CreateBrightnessProviderOptions,
): BrightnessProvider => {
  const platform = options.platform ?? process.platform;
  if (platform === "linux") {
    return createLinuxBrightnessProvider({
      executor: options.executor,
      env: options.env,
      logger: options.logger,
    });
  }
  if (platform === "darwin") {
    return createDarwinBrightnessProvider({
      executor: options.executor,
      logger: options.logger,
    });
  }
  if (platform === "win32") {
    return createWindowsBrightnessProvider({
      executor: options.executor,
      logger: options.logger,
    });
  }
  void createNullBrightnessProvider(options.logger);
  throw new ProviderError(
    "UNSUPPORTED_PLATFORM",
    `Brightness provider not implemented for platform '${platform}' in this build`,
  );
};
