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

// ponytail: `media-control` (brew install media-control) is the macOS analogue
// of Linux's playerctl — one system-wide interface over whatever is actually
// playing, including browsers, rather than a per-app AppleScript dictionary.
// It wraps MediaRemote, so it sees Chrome, Safari, Spotify, Music, VLC and the
// rest through the same Now Playing surface the media keys drive.
//
// Everything below the helper stays as the fallback: when media-control is not
// installed we can still talk to the scriptable desktop players directly, so a
// user who only uses Spotify keeps working without installing anything.
const MEDIA_CONTROL_BIN = "media-control"

export const MEDIA_CONTROL_HINT =
  "install it with `brew install media-control` for media detection across all apps (browsers included)"

interface MediaControlPayload {
  readonly title?: string | null
  readonly artist?: string | null
  readonly album?: string | null
  readonly duration?: number | null
  readonly elapsedTime?: number | null
  readonly elapsedTimeNow?: number | null
  readonly playing?: boolean | null
}

export const parseMediaControlPayload = (
  stdout: string,
): Omit<MediaStatus, "volume" | "muted"> | null => {
  const text = stdout.trim()
  if (text.length === 0) return null
  let raw: MediaControlPayload
  try {
    raw = JSON.parse(text) as MediaControlPayload
  } catch {
    return null
  }
  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  // No title means nothing is loaded in the Now Playing surface at all.
  if (title.length === 0) {
    return {
      track: null,
      totalTime: 0,
      currentTime: 0,
      playStatus: "unavailable",
    }
  }
  const artist = typeof raw.artist === "string" ? raw.artist.trim() : ""
  const album = typeof raw.album === "string" ? raw.album.trim() : ""
  const duration = typeof raw.duration === "number" ? raw.duration : 0
  const elapsed =
    typeof raw.elapsedTimeNow === "number"
      ? raw.elapsedTimeNow
      : typeof raw.elapsedTime === "number"
        ? raw.elapsedTime
        : 0
  return {
    track: { name: title, artist, ...(album.length > 0 ? { album } : {}) },
    totalTime: Number.isFinite(duration) ? Math.max(0, duration) : 0,
    currentTime: Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0,
    // `playing` is the only authoritative flag; a paused track still reports a
    // full payload, so absence of `playing` means paused rather than stopped.
    playStatus: raw.playing === true ? "play" : "pause",
  }
}

export const createDarwinProvider = (deps: DarwinDeps): MediaStatusProvider => {
  // null = not probed yet, true/false = cached result of `media-control test`.
  let helperUsable: boolean | null = null

  const hasMediaControl = async (): Promise<boolean> => {
    if (helperUsable !== null) return helperUsable
    try {
      // `test` reports whether the tool can operate on this macOS version —
      // MediaRemote access has been tightened repeatedly, so a present binary
      // is not proof of a working one.
      const r = await deps.executor.run(MEDIA_CONTROL_BIN, ["test"], {
        timeoutMs: 2_000,
      })
      helperUsable = r.exitCode === 0
    } catch {
      helperUsable = false
    }
    return helperUsable
  }

  const mediaControlStatus = async (): Promise<Omit<
    MediaStatus,
    "volume" | "muted"
  > | null> => {
    try {
      const r = await deps.executor.run(
        MEDIA_CONTROL_BIN,
        ["get", "--now", "--no-artwork"],
        { timeoutMs: 2_000 },
      )
      if (r.exitCode !== 0) return null
      return parseMediaControlPayload(r.stdout)
    } catch {
      return null
    }
  }

  const mediaControlCommand = async (command: string): Promise<boolean> => {
    if (!(await hasMediaControl())) return false
    try {
      const r = await deps.executor.run(MEDIA_CONTROL_BIN, [command], {
        timeoutMs: 2_000,
      })
      return r.exitCode === 0
    } catch {
      return false
    }
  }

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

  /** media-control first (covers every app), scriptable players as fallback. */
  const control = async (
    helperCommand: string,
    appleScriptCommand: string,
  ): Promise<void> => {
    if (await mediaControlCommand(helperCommand)) return
    await tellPlayer(appleScriptCommand)
  }

  return {
    async getStatus() {
      if (await hasMediaControl()) {
        const [status, volume] = await Promise.all([
          mediaControlStatus(),
          readVolume(deps),
        ])
        if (status !== null) return { ...status, ...volume }
        return { ...UNAVAILABLE, ...volume }
      }
      return legacyGetStatus(deps)
    },

    async play() {
      await control("play", "play")
    },
    async pause() {
      await control("pause", "pause")
    },
    async toggle() {
      await control("toggle-play-pause", "playpause")
    },
    async next() {
      await control("next-track", "next track")
    },
    async previous() {
      await control("previous-track", "previous track")
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

/**
 * AppleScript-only status path, used when media-control is not installed. It
 * can only see the scriptable desktop players, which is why media-control is
 * preferred — but it keeps Spotify/Music users working with no extra install.
 */
const legacyGetStatus = async (deps: DarwinDeps): Promise<MediaStatus> => {
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
}
