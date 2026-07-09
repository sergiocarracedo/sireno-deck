import type {
  MediaStatus,
  MediaStatusProvider,
  ProviderExecutor,
} from "./types"

interface DarwinDeps {
  readonly executor: ProviderExecutor
}

const STATUS_MAP = {
  playing: "play",
  paused: "pause",
  stopped: "stop",
} as const satisfies Record<string, MediaStatus["playStatus"]>

const runOsascript = async (
  deps: DarwinDeps,
  script: string,
): Promise<void> => {
  const result = await deps.executor.run("osascript", ["-e", script], {
    timeoutMs: 5_000,
  })
  if (result.exitCode !== 0) {
    throw new Error(
      `osascript failed: ${result.stderr.trim() || "exit " + result.exitCode}`,
    )
  }
}

const SCRIPT_PLAY = `tell application "Spotify" to play`
const SCRIPT_PAUSE = `tell application "Spotify" to pause`
const SCRIPT_TOGGLE = `tell application "Spotify" to playpause`
const SCRIPT_NEXT = `tell application "Spotify" to next track`
const SCRIPT_PREVIOUS = `tell application "Spotify" to previous track`
const SCRIPT_GET_STATE = `tell application "Spotify" to player state as string`
const SCRIPT_GET_TRACK = `tell application "Spotify" to get {name, artist, album} of current track as list`
const SCRIPT_GET_VOLUME = `tell application "Spotify" to sound volume as integer`
const SCRIPT_SET_VOLUME = (v: number) =>
  `tell application "Spotify" to set sound volume to ${v}`

const parseVolume = (raw: string): number => {
  const n = Number.parseInt(raw.trim(), 10)
  if (Number.isNaN(n)) return 100
  return Math.max(0, Math.min(100, n))
}

const readStatus = async (deps: DarwinDeps): Promise<MediaStatus> => {
  const [stateResult, trackResult] = await Promise.all([
    deps.executor.run("osascript", ["-e", SCRIPT_GET_STATE], {
      timeoutMs: 2_000,
    }),
    deps.executor.run("osascript", ["-e", SCRIPT_GET_TRACK], {
      timeoutMs: 2_000,
    }),
  ])

  let playStatus: MediaStatus["playStatus"] = "unavailable"
  if (stateResult.exitCode === 0) {
    const s = stateResult.stdout.trim().toLowerCase()
    playStatus =
      (STATUS_MAP[s as keyof typeof STATUS_MAP] as
        | MediaStatus["playStatus"]
        | undefined) ?? "unavailable"
  }

  const track =
    trackResult.exitCode === 0 && trackResult.stdout.trim().length > 0
      ? (() => {
          const parts = trackResult.stdout
            .trim()
            .split(",")
            .map((s) => s.trim())
          const name = parts[0] ?? ""
          if (name.length === 0 || name === "missing value") return null
          return {
            name,
            artist:
              parts[1] !== undefined &&
              parts[1].length > 0 &&
              parts[1] !== "missing value"
                ? parts[1]
                : "",
            album:
              parts[2] !== undefined &&
              parts[2].length > 0 &&
              parts[2] !== "missing value"
                ? parts[2]
                : undefined,
          }
        })()
      : null

  return {
    track,
    totalTime: 0,
    currentTime: 0,
    playStatus,
    volume: 1,
    muted: false,
  }
}

export const createDarwinProvider = (deps: DarwinDeps): MediaStatusProvider => {
  return {
    async getStatus() {
      return readStatus(deps)
    },

    async play() {
      await runOsascript(deps, SCRIPT_PLAY)
    },
    async pause() {
      await runOsascript(deps, SCRIPT_PAUSE)
    },
    async toggle() {
      await runOsascript(deps, SCRIPT_TOGGLE)
    },
    async next() {
      await runOsascript(deps, SCRIPT_NEXT)
    },
    async previous() {
      await runOsascript(deps, SCRIPT_PREVIOUS)
    },

    async setVolume(value) {
      await runOsascript(deps, SCRIPT_SET_VOLUME(Math.round(value * 100)))
    },
    async volumeUp(step) {
      const current = parseVolume(
        (
          await deps.executor.run("osascript", ["-e", SCRIPT_GET_VOLUME], {
            timeoutMs: 2_000,
          })
        ).stdout,
      )
      await runOsascript(
        deps,
        SCRIPT_SET_VOLUME(Math.min(100, current + Math.round(step * 100))),
      )
    },
    async volumeDown(step) {
      const current = parseVolume(
        (
          await deps.executor.run("osascript", ["-e", SCRIPT_GET_VOLUME], {
            timeoutMs: 2_000,
          })
        ).stdout,
      )
      await runOsascript(
        deps,
        SCRIPT_SET_VOLUME(Math.max(0, current - Math.round(step * 100))),
      )
    },
    async toggleMute() {
      const current = parseVolume(
        (
          await deps.executor.run("osascript", ["-e", SCRIPT_GET_VOLUME], {
            timeoutMs: 2_000,
          })
        ).stdout,
      )
      if (current === 0) {
        await runOsascript(deps, SCRIPT_SET_VOLUME(100))
      } else {
        await runOsascript(deps, SCRIPT_SET_VOLUME(0))
      }
    },
  }
}
