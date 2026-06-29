import type { MediaProvider } from "@/system/provider";
import type { AddonPoller } from "@/addon/api-types";

interface CommandExecutor {
  run(
    command: string,
    args: ReadonlyArray<string>,
    options?: { timeoutMs?: number },
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
}

export interface MediaPlayerPollerDeps {
  readonly mediaProvider: MediaProvider | null;
  readonly executor?: CommandExecutor;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const createPoller = (deps: MediaPlayerPollerDeps): AddonPoller => ({
  channels: [
    {
      channel: "media-player:state",
      intervalMs: 2_000,
      poll: async () => {
        const fallback = {
          title: null,
          artist: null,
          isPlaying: false,
          volume: 0,
          canGoNext: false,
          canGoPrev: false,
          source: null,
          status: null,
          progress: 0,
          time: "",
        };

        if (deps.mediaProvider === null) return fallback;

        try {
          const meta = await deps.mediaProvider.getCurrent();
          if (meta === null) return fallback;

          let status: string | null = null;
          let positionSeconds: number | undefined;
          let durationSeconds: number | undefined;
          if (deps.executor !== undefined) {
            try {
              const statusResult = await deps.executor.run("playerctl", ["status"], { timeoutMs: 500 });
              if (statusResult.exitCode === 0) {
                const raw = statusResult.stdout.trim().toLowerCase();
                if (raw === "playing") status = "play";
                else if (raw === "paused") status = "pause";
                else if (raw === "stopped") status = "stop";
              }
            } catch {
              // playerctl status not available
            }
            try {
              const posResult = await deps.executor.run("playerctl", ["position"], { timeoutMs: 500 });
              if (posResult.exitCode === 0) {
                const val = Number.parseFloat(posResult.stdout.trim());
                if (Number.isFinite(val) && val >= 0) positionSeconds = val;
              }
            } catch {
              // playerctl position not available
            }
            try {
              const durResult = await deps.executor.run(
                "playerctl", ["metadata", "--format", "{{ mpris:length }}"], { timeoutMs: 500 },
              );
              if (durResult.exitCode === 0) {
                const micros = Number.parseFloat(durResult.stdout.trim());
                if (Number.isFinite(micros) && micros > 0) durationSeconds = micros / 1_000_000;
              }
            } catch {
              // playerctl metadata length not available
            }
          }

          const progress =
            positionSeconds !== undefined && durationSeconds !== undefined && durationSeconds > 0
              ? Math.min(100, Math.max(0, Math.round((positionSeconds / durationSeconds) * 100)))
              : 0;
          const time = positionSeconds !== undefined ? formatTime(positionSeconds) : "";

          return {
            title: meta.title,
            artist: meta.artist,
            isPlaying: status === "play" || status === null,
            volume: 0,
            canGoNext: meta !== null,
            canGoPrev: meta !== null,
            source: null,
            status,
            progress,
            time,
          };
        } catch {
          return fallback;
        }
      },
    },
  ],
});
