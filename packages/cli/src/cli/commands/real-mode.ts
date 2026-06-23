import type pino from "pino";

import type { PubSub } from "@/core/pub-sub";
import type { StreamDeckDevice } from "@/device/stream-deck";
import { BrowserRenderer } from "@/render/browser-renderer";

export interface RunRealModeOptions {
  readonly frontendUrl: string;
  readonly device: StreamDeckDevice;
  readonly intervalMs?: number;
  readonly pubSub?: PubSub;
  readonly logger: pino.Logger;
}

export interface RealModeHandle {
  stop(): Promise<void>;
}

export const runRealMode = async (options: RunRealModeOptions): Promise<RealModeHandle> => {
  const renderer = new BrowserRenderer({
    frontendUrl: options.frontendUrl,
    device: options.device,
    logger: options.logger,
    ...(options.intervalMs !== undefined ? { intervalMs: options.intervalMs } : {}),
    ...(options.pubSub !== undefined ? { pubSub: options.pubSub } : {}),
  });
  await renderer.start();
  return {
    async stop(): Promise<void> {
      try {
        await renderer.stop();
      } finally {
        await options.device.close();
      }
    },
  };
};
