import type {
  MediaStatus,
  MediaStatusProvider,
  ProviderExecutor,
} from "./types"

interface DarwinDeps {
  readonly executor: ProviderExecutor
}

// ponytail: this provider used to hardcode `tell application "Spotify"` for
// every call. Three problems, all user-visible:
//
//  1. AppleScript's `tell application "X"` LAUNCHES X if it isn't running. The
//     media addon polls getStatus on a timer, so on any Mac with Spotify
//     installed but closed the poller reopened Spotify over and over.
//  2. The volume verbs drove Spotify's own in-app volume, not the system
//     volume, so `media:volume:up` did nothing audible when another app was
//     playing — and nothing at all without Spotify.
//  3. getStatus hardcoded `volume: 1, muted: false, totalTime: 0,
//     currentTime: 0`, so the volume readout was pinned to full and the
//     progress bar never moved.
//
// Now: the running player is discovered from the System Events process list
// (which neither launches anything nor needs an Accessibility grant), track
// state comes from whichever supported player is actually running, and volume
// is the real system output volume. The Linux provider is player-agnostic via
// MPRIS; this is the closest macOS equivalent.

// ASCII unit separator - cannot occur in track metadata.
const SEP = "\u001f"

interface PlayerSpec {
  /** Process name as it appears in the System Events process list. */
  readonly process: string
  /** Application name to address in AppleScript. */
  readonly app: string
  /** `duration of current track` unit — Spotify reports ms, Music seconds. */
  readonly durationUnit: "ms" | "s"
}

// Order is preference order when several are running.
const PLAYERS: ReadonlyArray<PlayerSpec> = [
  { process: "Spotify", app: "Spotify", durationUnit: "ms" },
  { process: "Music", app: "Music", durationUnit: "s" },
  { process: "TV", app: "TV", durationUnit: "s" },
]

const STATUS_MAP: Readonly<Record<string, MediaStatus["playStatus"]>> = {
  playing: "play",
  paused: "pause",
  stopped: "stop",
  "fast forwarding": "play",
  rewinding: "play",
}

const UNAVAILABLE: MediaStatus = {
  track: null,
  totalTime: 0,
  currentTime: 0,
  playStatus: "unavailable",
  volume: 1,
  muted: false,
}

const LIST_PROCESSES = `tell application "System Events" to get name of every process whose background only is false`

const statusScript = (app: string): string => `set sep to (ASCII character 31)
tell application "${app}"
  set st to (player state as string)
  try
    set pos to player position
  on error
    set pos to 0
  end try
  try
    set t to name of current track
    set a to artist of current track
    set al to album of current track
    set d to duration of current track
  on error
    set t to ""
    set a to ""
    set al to ""
    set d to 0
  end try
  set out to st & sep & pos & sep & d & sep & t & sep & a & sep & al
end tell
return out`

const VOLUME_SCRIPT = `set sep to (ASCII character 31)
set s to (get volume settings)
return (output volume of s as string) & sep & (output muted of s as string)`

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n))

const toNumber = (raw: string | undefined): number => {
  const n = Number.parseFloat((raw ?? "").trim())
  return Number.isFinite(n) ? n : 0
}

export const parseVolumeSettings = (
  stdout: string,
): { volume: number; muted: boolean } => {
  const [vol, muted] = stdout.trim().split(SEP)
  return {
    volume: clamp01(toNumber(vol) / 100),
    muted: (muted ?? "").trim().toLowerCase() === "true",
  }
}

export const parsePlayerStatus = (
  stdout: string,
  durationUnit: PlayerSpec["durationUnit"],
): Omit<MediaStatus, "volume" | "muted"> => {
  const parts = stdout.trim().split(SEP)
  const state = (parts[0] ?? "").trim().toLowerCase()
  const currentTime = toNumber(parts[1])
  const rawDuration = toNumber(parts[2])
  const totalTime = durationUnit === "ms" ? rawDuration / 1000 : rawDuration
  const name = (parts[3] ?? "").trim()
  const artist = (parts[4] ?? "").trim()
  const album = (parts[5] ?? "").trim()
  return {
    track:
      name.length > 0 && name !== "missing value"
        ? {
            name,
            artist: artist === "missing value" ? "" : artist,
            ...(album.length > 0 && album !== "missing value" ? { album } : {}),
          }
        : null,
    totalTime,
    currentTime,
    playStatus: STATUS_MAP[state] ?? "unavailable",
  }
}

const runOsascript = async (
  deps: DarwinDeps,
  script: string,
  timeoutMs = 2_000,
): Promise<{ exitCode: number; stdout: string; stderr: string }> =>
  deps.executor.run("osascript", ["-e", script], { timeoutMs })

const requireOsascript = async (
  deps: DarwinDeps,
  script: string,
): Promise<void> => {
  const result = await runOsascript(deps, script, 5_000)
  if (result.exitCode !== 0) {
    throw new Error(
      `osascript failed: ${result.stderr.trim() || "exit " + result.exitCode}`,
    )
  }
}

/**
 * The supported player that is currently running, or null. Reads the System
 * Events process list rather than probing each app, because probing an app is
 * what launches it.
 */
const activePlayer = async (deps: DarwinDeps): Promise<PlayerSpec | null> => {
  const result = await runOsascript(deps, LIST_PROCESSES)
  if (result.exitCode !== 0) return null
  const running = new Set(
    result.stdout
      .trim()
      .split(",")
      .map((s) => s.trim()),
  )
  return PLAYERS.find((p) => running.has(p.process)) ?? null
}

const readVolume = async (
  deps: DarwinDeps,
): Promise<{ volume: number; muted: boolean }> => {
  const result = await runOsascript(deps, VOLUME_SCRIPT)
  if (result.exitCode !== 0) return { volume: 1, muted: false }
  return parseVolumeSettings(result.stdout)
}

const setSystemVolume = async (
  deps: DarwinDeps,
  fraction: number,
): Promise<void> => {
  const pct = Math.round(clamp01(fraction) * 100)
  await requireOsascript(deps, `set volume output volume ${pct}`)
}

export const createDarwinProvider = (deps: DarwinDeps): MediaStatusProvider => {
  // Control verbs are no-ops when nothing is playing — deliberately NOT a
  // throw, so a deck press on an idle machine doesn't surface an error tile.
  const tellPlayer = async (command: string): Promise<void> => {
    const player = await activePlayer(deps)
    if (player === null) return
    await requireOsascript(
      deps,
      `tell application "${player.app}" to ${command}`,
    )
  }

  return {
    async getStatus() {
      const [player, volume] = await Promise.all([
        activePlayer(deps),
        readVolume(deps),
      ])
      if (player === null) return { ...UNAVAILABLE, ...volume }
      const result = await runOsascript(deps, statusScript(player.app))
      if (result.exitCode !== 0) return { ...UNAVAILABLE, ...volume }
      return {
        ...parsePlayerStatus(result.stdout, player.durationUnit),
        ...volume,
      }
    },

    async play() {
      await tellPlayer("play")
    },
    async pause() {
      await tellPlayer("pause")
    },
    async toggle() {
      await tellPlayer("playpause")
    },
    async next() {
      await tellPlayer("next track")
    },
    async previous() {
      await tellPlayer("previous track")
    },

    async setVolume(value) {
      await setSystemVolume(deps, value)
    },
    async volumeUp(step) {
      const { volume } = await readVolume(deps)
      await setSystemVolume(deps, volume + step)
    },
    async volumeDown(step) {
      const { volume } = await readVolume(deps)
      await setSystemVolume(deps, volume - step)
    },
    async toggleMute() {
      const { muted } = await readVolume(deps)
      await requireOsascript(
        deps,
        `set volume ${muted ? "without" : "with"} output muted`,
      )
    },
  }
}
