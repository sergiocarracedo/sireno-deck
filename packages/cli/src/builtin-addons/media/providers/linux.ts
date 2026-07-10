import type {
  MediaStatus,
  MediaStatusProvider,
  ProviderExecutor,
} from "./types"

const METADATA_TIMEOUT_MS = 2_000

interface LinuxDeps {
  readonly executor: ProviderExecutor
}

const STATUS_MAP = {
  Playing: "play",
  Paused: "pause",
  Stopped: "stop",
} as const satisfies Record<string, MediaStatus["playStatus"]>

const runWpctl = async (
  deps: LinuxDeps,
  args: ReadonlyArray<string>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  return deps.executor.run("wpctl", args, { timeoutMs: 5_000 })
}

const parseWpctlVolume = (stdout: string): number => {
  const match = stdout.match(/Volume:\s*(\d+\.?\d*)/)
  return match ? Math.max(0, Math.min(1, parseFloat(match[1]))) : 1
}

const readStatus = async (deps: LinuxDeps): Promise<MediaStatus> => {
  const [metaResult, positionResult] = await Promise.all([
    deps.executor.run(
      "playerctl",
      [
        "metadata",
        "--format",
        "{{ title }}\t{{ artist }}\t{{ album }}\t{{ mpris:length }}",
      ],
      { timeoutMs: METADATA_TIMEOUT_MS },
    ),
    deps.executor.run("playerctl", ["position"], {
      timeoutMs: METADATA_TIMEOUT_MS,
    }),
  ])

  const [playStatusResult, volumeResult, muteResult] = await Promise.all([
    deps.executor.run("playerctl", ["status"], {
      timeoutMs: METADATA_TIMEOUT_MS,
    }),
    runWpctl(deps, ["get-volume", "@DEFAULT_AUDIO_SINK@"]),
    runWpctl(deps, ["get-mute", "@DEFAULT_AUDIO_SINK@"]),
  ])

  const track =
    metaResult.exitCode === 0 && metaResult.stdout.trim().length > 0
      ? (() => {
          const parts = metaResult.stdout.trim().split("\t")
          const name = (parts[0] ?? "").trim()
          if (name.length === 0) return null
          return {
            name,
            artist: parts[1]?.trim() || "",
            album: parts[2]?.trim() || undefined,
          }
        })()
      : null

  const totalTime =
    metaResult.exitCode === 0
      ? (() => {
          const parts = metaResult.stdout.trim().split("\t")
          const lenStr = parts[3]?.trim()
          if (!lenStr) return 0
          const us = Number.parseInt(lenStr, 10)
          return Math.round(us / 1_000_000)
        })()
      : 0

  const currentTime =
    positionResult.exitCode === 0
      ? Math.round(Number.parseFloat(positionResult.stdout.trim()))
      : 0

  const volume =
    volumeResult.exitCode === 0 ? parseWpctlVolume(volumeResult.stdout) : 1

  const statusStr = playStatusResult.stdout.trim()
  const playStatus: MediaStatus["playStatus"] =
    STATUS_MAP[statusStr as keyof typeof STATUS_MAP] ?? "unavailable"

  return {
    track,
    totalTime,
    currentTime,
    playStatus,
    volume,
    muted: parseGetMute(muteResult.stdout),
  }
}

const parseGetMute = (stdout: string): boolean =>
  /^Muted:\s+yes$/im.test(stdout)

export const createLinuxProvider = (deps: LinuxDeps): MediaStatusProvider => ({
  async getStatus() {
    return readStatus(deps)
  },

  async play() {
    await deps.executor.run("playerctl", ["play"], {
      timeoutMs: METADATA_TIMEOUT_MS,
    })
  },
  async pause() {
    await deps.executor.run("playerctl", ["pause"], {
      timeoutMs: METADATA_TIMEOUT_MS,
    })
  },
  async toggle() {
    await deps.executor.run("playerctl", ["play-pause"], {
      timeoutMs: METADATA_TIMEOUT_MS,
    })
  },
  async next() {
    await deps.executor.run("playerctl", ["next"], {
      timeoutMs: METADATA_TIMEOUT_MS,
    })
  },
  async previous() {
    await deps.executor.run("playerctl", ["previous"], {
      timeoutMs: METADATA_TIMEOUT_MS,
    })
  },

  async setVolume(value: number) {
    await runWpctl(deps, [
      "set-volume",
      "@DEFAULT_AUDIO_SINK@",
      String(Math.round(value * 100)) + "%",
    ])
  },
  async volumeUp(step: number) {
    await runWpctl(deps, [
      "set-volume",
      "@DEFAULT_AUDIO_SINK@",
      String(Math.round(step * 100)) + "%+",
    ])
  },
  async volumeDown(step: number) {
    await runWpctl(deps, [
      "set-volume",
      "@DEFAULT_AUDIO_SINK@",
      String(Math.round(step * 100)) + "%-",
    ])
  },
  async toggleMute() {
    await runWpctl(deps, ["set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])
  },
})
