import { useEffect, useState } from "react";

import type { AddonButtonTypeDefinition } from "@/addon/api.ts";
import { SplitActionSurface as SplitAction } from "@/ui/index.ts";

import {
  MediaMuteButtonSchema,
  MediaPlayerButtonSchema,
  MediaVolumeButtonSchema,
  type MediaMuteButtonConfig,
  type MediaVolumeButtonConfig,
} from "../schemas.ts";

const PlayerGlyph = ({ state }: { state: "playing" | "paused" | "unknown" }) => {
  const ch = state === "playing" ? "⏸" : state === "paused" ? "▶" : "•";
  return <span className="text-2xl leading-none">{ch}</span>;
};

export const builtinMediaPlayerButton: AddonButtonTypeDefinition = {
  type: "core:media-player",
  configSchema: MediaPlayerButtonSchema,
  render: ({ methods }) => {
    const [state, setState] = useState<"playing" | "paused" | "unknown">("unknown");

    useEffect(() => {
      const id = setInterval(() => {
        void methods["media-get-current"]?.().then((meta) => {
          if (meta === null || meta === undefined) {
            setState("unknown");
            return;
          }
          const m = meta as { state?: string };
          setState(m.state === "playing" ? "playing" : m.state === "paused" ? "paused" : "unknown");
        });
      }, 2000);
      return () => clearInterval(id);
    }, [methods]);

    const toggle = () => {
      void methods["media-toggle"]?.();
    };
    const next = () => {
      void methods["media-next"]?.();
    };
    const prev = () => {
      void methods["media-previous"]?.();
    };
    const volUp = () => {
      void methods["media-volume-up"]?.();
    };
    const volDown = () => {
      void methods["media-volume-down"]?.();
    };

    return (
      <SplitAction
        left={{
          content: (
            <div className="flex h-full w-full items-center justify-around">
              <span
                className="cursor-pointer text-xl text-muted hover:text-fg"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
              >
                ⏮
              </span>
              <span
                className="cursor-pointer text-fg"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
              >
                <PlayerGlyph state={state} />
              </span>
              <span
                className="cursor-pointer text-xl text-muted hover:text-fg"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
              >
                ⏭
              </span>
            </div>
          ),
        }}
        right={{
          content: (
            <div className="flex h-full w-full items-center justify-around">
              <span
                className="cursor-pointer text-xl text-muted hover:text-fg"
                onClick={(e) => {
                  e.stopPropagation();
                  volDown();
                }}
              >
                🔉
              </span>
              <span
                className="cursor-pointer text-xl text-muted hover:text-fg"
                onClick={(e) => {
                  e.stopPropagation();
                  volUp();
                }}
              >
                🔊
              </span>
            </div>
          ),
        }}
      />
    );
  },
  full: true,
};

export const builtinMediaMuteButton: AddonButtonTypeDefinition = {
  type: "core:media-mute",
  configSchema: MediaMuteButtonSchema,
  render: () => (
    <span className="flex h-full w-full items-center justify-center text-2xl">🔇</span>
  ),
  onTap: ({ methods }) => {
    void methods["media-toggle-mute"]?.();
  },
};

export const builtinMediaVolumeButton: AddonButtonTypeDefinition = {
  type: "core:media-volume",
  configSchema: MediaVolumeButtonSchema,
  render: ({ config }) => {
    const arrow = config.direction === "down" ? "🔉" : "🔊";
    return <span className="flex h-full w-full items-center justify-center text-2xl">{arrow}</span>;
  },
  onTap: ({ methods, config }) => {
    const method = config.direction === "down" ? "media-volume-down" : "media-volume-up";
    void methods[method]?.(config.step);
  },
};

export const mediaPlayerAddon = {
  apiVersion: 3 as const,
  name: "media-player",
  kind: "runtime" as const,
  frontend: { main: "./frontend.tsx" },
  publishIntervalMs: 2000,
  buttons: [builtinMediaPlayerButton, builtinMediaMuteButton, builtinMediaVolumeButton],
};

export type { MediaMuteButtonConfig, MediaVolumeButtonConfig };