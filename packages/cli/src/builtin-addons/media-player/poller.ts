import type { MediaProvider } from "@/system/provider";
import type { AddonPoller } from "@/addon/api-types.ts";

export interface MediaPlayerPollerDeps {
  readonly mediaProvider: MediaProvider | null;
}

export const createPoller = (deps: MediaPlayerPollerDeps): AddonPoller => ({
  channels: [
    {
      channel: "media-player:state",
      intervalMs: 2_000,
      poll: async () => {
        if (deps.mediaProvider === null) {
          return {
            title: null,
            artist: null,
            isPlaying: false,
            volume: 0,
            canGoNext: false,
            canGoPrev: false,
          };
        }
        try {
          const meta = await deps.mediaProvider.getCurrent();
          return {
            title: meta?.title ?? null,
            artist: meta?.artist ?? null,
            isPlaying: meta !== null,
            volume: 0,
            canGoNext: meta !== null,
            canGoPrev: meta !== null,
          };
        } catch {
          return {
            title: null,
            artist: null,
            isPlaying: false,
            volume: 0,
            canGoNext: false,
            canGoPrev: false,
          };
        }
      },
    },
  ],
});
