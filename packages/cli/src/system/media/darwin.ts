import type pino from "pino"

import {
  type MediaMetadata,
  type MediaProvider,
  ProviderError,
  withTimeout,
} from "@/system/provider"

export interface CommandExecutor {
  run(
    command: string,
    args: ReadonlyArray<string>,
    options?: { timeoutMs?: number },
  ): Promise<{
    exitCode: number
    stdout: string
    stderr: string
  }>
}

export interface DarwinMediaDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
}

const SCRIPT_PLAY = `tell application "Spotify" to play`
const SCRIPT_PAUSE = `tell application "Spotify" to pause`
const SCRIPT_TOGGLE = `tell application "Spotify" to playpause`
const SCRIPT_NEXT = `tell application "Spotify" to next track`
const SCRIPT_PREVIOUS = `tell application "Spotify" to previous track`

const SCRIPT_METADATA = `tell application "Spotify" to get {name, artist, album} of current track`

const DEFAULT_POLL_MS = 2_000

const parseMetadata = (raw: string): MediaMetadata | null => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  const parts = trimmed.split(",").map((s) => s.trim())
  const title = parts[0] ?? ""
  if (title.length === 0) return null
  return {
    title,
    artist: parts[1] !== undefined && parts[1].length > 0 ? parts[1] : null,
    album: parts[2] !== undefined && parts[2].length > 0 ? parts[2] : null,
    artUrl: null,
  }
}

const runScript = async (
  deps: DarwinMediaDeps,
  script: string,
): Promise<void> => {
  try {
    const result = await withTimeout(
      deps.executor.run("osascript", ["-e", script], { timeoutMs: 5_000 }),
      5_500,
    )
    if (result.exitCode !== 0) {
      throw new ProviderError(
        "EXEC_FAILED",
        `osascript: ${result.stderr.trim() || "exit " + result.exitCode}`,
      )
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err
    throw new ProviderError(
      "EXEC_FAILED",
      `osascript failed: ${(err as Error).message ?? "unknown"}`,
    )
  }
}

export const createDarwinMediaProvider = async (
  deps: DarwinMediaDeps,
): Promise<MediaProvider> => {
  const pollMs = deps.pollIntervalMs ?? DEFAULT_POLL_MS
  const subscribers = new Set<(m: MediaMetadata | null) => void>()
  let lastMeta: MediaMetadata | null = null
  let stopped = false

  const pollOnce = async (): Promise<MediaMetadata | null> => {
    try {
      const result = await deps.executor.run(
        "osascript",
        ["-e", SCRIPT_METADATA],
        {
          timeoutMs: 2_000,
        },
      )
      if (result.exitCode !== 0) return lastMeta
      return parseMetadata(result.stdout)
    } catch {
      return lastMeta
    }
  }

  let interval: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (stopped) return
    void pollOnce().then((m) => {
      if (stopped) return
      const same =
        lastMeta !== null &&
        m !== null &&
        lastMeta.title === m.title &&
        lastMeta.artist === m.artist
      if (!same) {
        lastMeta = m
        for (const h of subscribers) h(m)
      }
    })
  }, pollMs)

  return {
    async play() {
      await runScript(deps, SCRIPT_PLAY)
    },
    async pause() {
      await runScript(deps, SCRIPT_PAUSE)
    },
    async toggle() {
      await runScript(deps, SCRIPT_TOGGLE)
    },
    async next() {
      await runScript(deps, SCRIPT_NEXT)
    },
    async previous() {
      await runScript(deps, SCRIPT_PREVIOUS)
    },
    async getCurrent() {
      return pollOnce()
    },
    onChange(handler) {
      subscribers.add(handler)
      return () => {
        subscribers.delete(handler)
      }
    },
    async stop() {
      stopped = true
      if (interval !== null) {
        clearInterval(interval)
        interval = null
      }
    },
  }
}
