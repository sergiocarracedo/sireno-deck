import { createDarwinProvider } from "./darwin";
import { createLinuxProvider } from "./linux";
import type { MediaStatusProvider, ProviderExecutor } from "./types";
import { createWindowsProvider } from "./windows";

export type { MediaStatus, MediaStatusProvider, MediaTrack, ProviderExecutor } from "./types";

export const createMediaProvider = (
  platform: NodeJS.Platform,
  executor: ProviderExecutor,
): MediaStatusProvider => {
  switch (platform) {
    case "linux":
      return createLinuxProvider({ executor });
    case "darwin":
      return createDarwinProvider({ executor });
    case "win32":
      return createWindowsProvider({ executor });
    default:
      return createLinuxProvider({ executor });
  }
};
