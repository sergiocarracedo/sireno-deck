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

const PLAYER_FORMAT =
  "{{ playerName }}\t{{ status }}\t{{ title }}\t{{ artist }}\t{{ album }}\t{{ mpris:length }}"

const selectPlayer = (
  stdout: string,
): { name: string; status: string } | null => {
  const players = stdout
    .trim()
    .split("\n")
    .map((line) => line.split("\t"))
    .filter(([name, status]) => name && status)
    .map(([name, status]) => ({ name: name!.trim(), status: status!.trim() }))

  return (
    players.find(({ status }) => status === "Playing" || status === "Paused") ??
    players[0] ??
    null
  )
}

const readStatus = async (deps: LinuxDeps): Promise<MediaStatus> => {
  const playerResult = await deps.executor.run(
    "playerctl",
    ["-a", "metadata", "--format", PLAYER_FORMAT],
    { timeoutMs: METADATA_TIMEOUT_MS },
  )
  const selectedPlayer = selectPlayer(playerResult.stdout)
  const playerArgs = selectedPlayer ? ["--player", selectedPlayer.name] : []

  const [metaResult, positionResult] = await Promise.all([
    deps.executor.run(
      "playerctl",
      [
        ...playerArgs,
        "metadata",
        "--format",
        "{{ title }}\t{{ artist }}\t{{ album }}\t{{ mpris:length }}",
      ],
      { timeoutMs: METADATA_TIMEOUT_MS },
    ),
    deps.executor.run("playerctl", [...playerArgs, "position"], {
      timeoutMs: METADATA_TIMEOUT_MS,
    }),
  ])

  const [playStatusResult, volumeResult] = await Promise.all([
    deps.executor.run("playerctl", [...playerArgs, "status"], {
      timeoutMs: METADATA_TIMEOUT_MS,
    }),
    runWpctl(deps, ["get-volume", "@DEFAULT_AUDIO_SINK@"]),
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

  const wpctlState =
    volumeResult.exitCode === 0
      ? parseWpctlVolumeLine(volumeResult.stdout)
      : { volume: 1, muted: false }

  const statusStr = selectedPlayer?.status ?? playStatusResult.stdout.trim()
  const playStatus: MediaStatus["playStatus"] =
    STATUS_MAP[statusStr as keyof typeof STATUS_MAP] ?? "unavailable"

  return {
    track,
    totalTime,
    currentTime,
    playStatus,
    volume: wpctlState.volume,
    muted: wpctlState.muted,
  }
}

interface WpctlVolumeLine {
  readonly volume: number
  readonly muted: boolean
}

const VOLUME_LINE_RE = /^Volume:\s*(\d+(?:\.\d+)?)(?:\s*\[\s*MUTED\s*\])?/im

const parseWpctlVolumeLine = (stdout: string): WpctlVolumeLine => {
  const match = stdout.match(VOLUME_LINE_RE)
  if (match === null) return { volume: 1, muted: false }
  const volume = Math.max(0, Math.min(1, parseFloat(match[1] ?? "")))
  return { volume, muted: /\[\s*MUTED\s*\]/i.test(match[0]) }
}

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
