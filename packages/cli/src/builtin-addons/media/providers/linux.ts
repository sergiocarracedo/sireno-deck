import type {
  MediaStatus,
  MediaStatusProvider,
  ProviderExecutor,
} from "./types";

const PLAYERCTL_TIMEOUT_MS = 5_000;
const METADATA_TIMEOUT_MS = 2_000;

interface LinuxDeps {
  readonly executor: ProviderExecutor;
}

const STATUS_MAP = {
  Playing: "play",
  Paused: "pause",
  Stopped: "stop",
} as const satisfies Record<string, MediaStatus["playStatus"]>;

const runPlayerctl = async (
  deps: LinuxDeps,
  args: ReadonlyArray<string>,
): Promise<void> => {
  const result = await deps.executor.run("playerctl", args, {
    timeoutMs: PLAYERCTL_TIMEOUT_MS,
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `playerctl ${args.join(" ")} exited ${result.exitCode}: ${result.stderr.trim()}`,
    );
  }
};

const readStatus = async (deps: LinuxDeps): Promise<MediaStatus> => {
  const [metaResult, volumeResult, positionResult] = await Promise.all([
    deps.executor.run(
      "playerctl",
      [
        "metadata",
        "--format",
        "{{ title }}\t{{ artist }}\t{{ album }}\t{{ mpris:length }}",
      ],
      { timeoutMs: METADATA_TIMEOUT_MS },
    ),
    deps.executor.run("playerctl", ["volume"], { timeoutMs: METADATA_TIMEOUT_MS }),
    deps.executor.run("playerctl", ["position"], { timeoutMs: METADATA_TIMEOUT_MS }),
  ]);

  const playStatusResult = await deps.executor.run("playerctl", ["status"], {
    timeoutMs: METADATA_TIMEOUT_MS,
  });

  const track =
    metaResult.exitCode === 0 && metaResult.stdout.trim().length > 0
      ? (() => {
          const parts = metaResult.stdout.trim().split("\t");
          const name = (parts[0] ?? "").trim();
          if (name.length === 0) return null;
          return {
            name,
            artist: parts[1] !== undefined && parts[1].trim().length > 0 ? parts[1].trim() : "",
            album: parts[2] !== undefined && parts[2].trim().length > 0 ? parts[2].trim() : undefined,
          };
        })()
      : null;

  const totalTime =
    metaResult.exitCode === 0 && metaResult.stdout.trim().length > 0
      ? (() => {
          const parts = metaResult.stdout.trim().split("\t");
          const lenStr = parts[3]?.trim();
          if (lenStr === undefined || lenStr.length === 0) return 0;
          const us = Number.parseInt(lenStr, 10);
          if (Number.isNaN(us)) return 0;
          return Math.round(us / 1_000_000);
        })()
      : 0;

  const currentTime =
    positionResult.exitCode === 0
      ? Math.round(Number.parseFloat(positionResult.stdout.trim()))
      : 0;

  const volume =
    volumeResult.exitCode === 0
      ? Math.max(0, Math.min(1, Number.parseFloat(volumeResult.stdout.trim())))
      : 1;

  const statusStr = playStatusResult.exitCode === 0 ? playStatusResult.stdout.trim() : "";
  const playStatus: MediaStatus["playStatus"] =
    (STATUS_MAP[statusStr as keyof typeof STATUS_MAP] as
      | MediaStatus["playStatus"]
      | undefined) ?? "unavailable";

  return {
    track,
    totalTime,
    currentTime,
    playStatus,
    volume,
    muted: false,
  };
};

const readMuted = async (deps: LinuxDeps): Promise<boolean> => {
  const result = await deps.executor.run("playerctl", ["mute"], {
    timeoutMs: METADATA_TIMEOUT_MS,
  });
  if (result.exitCode !== 0) return false;
  const val = result.stdout.trim().toLowerCase();
  return val === "true" || val === "yes";
};

export const createLinuxProvider = (
  deps: LinuxDeps,
): MediaStatusProvider => {
  return {
    async getStatus() {
      const status = await readStatus(deps);
      const muted = await readMuted(deps);
      return { ...status, muted };
    },

    async play() {
      await runPlayerctl(deps, ["play"]);
    },
    async pause() {
      await runPlayerctl(deps, ["pause"]);
    },
    async toggle() {
      await runPlayerctl(deps, ["play-pause"]);
    },
    async next() {
      await runPlayerctl(deps, ["next"]);
    },
    async previous() {
      await runPlayerctl(deps, ["previous"]);
    },

    async setVolume(value) {
      await runPlayerctl(deps, ["volume", String(Math.max(0, Math.min(1, value)))]);
    },
    async volumeUp(step) {
      const current = await this.getStatus();
      await runPlayerctl(
        deps,
        ["volume", String(Math.min(1, current.volume + step))],
      );
    },
    async volumeDown(step) {
      const current = await this.getStatus();
      await runPlayerctl(
        deps,
        ["volume", String(Math.max(0, current.volume - step))],
      );
    },
    async toggleMute() {
      await runPlayerctl(deps, ["mute"]);
    },
  };
};