import type { AddonFrontend, AddonGeneratedDeck } from "./api";

export const SIRENO_ADDON_API_VERSION = 1 as const;

export interface AddonPollerChannel {
  readonly channel: string;
  readonly intervalMs: number;
  readonly poll: () => unknown | Promise<unknown>;
}

export interface AddonPoller {
  readonly channels: ReadonlyArray<AddonPollerChannel>;
}

export type { AddonFrontend, AddonGeneratedDeck };
