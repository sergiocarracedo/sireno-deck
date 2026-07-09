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

export interface WindowsMediaDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
}

const PS_PLAY = `Add-Type -AssemblyName System.Runtime.WindowsRuntime; $null = [Windows.System.User, Windows.System, ContentType=WindowsRuntime]; $smtc = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Content,Windows,ContentType=WindowsRuntime]::RequestAsync().GetAwaiter().GetResult(); $null = $smtc.GetCurrentSession().TryPlayAsync().GetAwaiter().GetResult()`
const PS_PAUSE = `(Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 1) | Out-Null; (New-Object -ComObject WMPPlayerCtrl.1).controls.pause()`
const PS_TOGGLE = `(New-Object -ComObject WMPPlayerCtrl.1).controls.play()`
const PS_NEXT = `(New-Object -ComObject WMPPlayerCtrl.1).controls.next()`
const PS_PREV = `(New-Object -ComObject WMPPlayerCtrl.1).controls.previous()`

const PS_GET_METADATA = `try { $m = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Content,Windows,ContentType=WindowsRuntime]::RequestAsync().GetAwaiter().GetResult().GetCurrentSession().GetMediaPropertiesAsync().GetAwaiter().GetResult(); "{0}|{1}|{2}" -f $m.Title, $m.Artist, $m.AlbumTitle } catch { "" }`

const DEFAULT_POLL_MS = 2_000

const parseMetadata = (raw: string): MediaMetadata | null => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  const parts = trimmed.split("|")
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
  deps: WindowsMediaDeps,
  script: string,
): Promise<void> => {
  try {
    const result = await withTimeout(
      deps.executor.run("powershell", ["-NoProfile", "-Command", script], {
        timeoutMs: 5_000,
      }),
      5_500,
    )
    if (result.exitCode !== 0) {
      throw new ProviderError(
        "EXEC_FAILED",
        `powershell: ${result.stderr.trim() || "exit " + result.exitCode}`,
      )
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err
    throw new ProviderError(
      "EXEC_FAILED",
      `powershell failed: ${(err as Error).message ?? "unknown"}`,
    )
  }
}

export const createWindowsMediaProvider = async (
  deps: WindowsMediaDeps,
): Promise<MediaProvider> => {
  const pollMs = deps.pollIntervalMs ?? DEFAULT_POLL_MS
  const subscribers = new Set<(m: MediaMetadata | null) => void>()
  let lastMeta: MediaMetadata | null = null
  let stopped = false

  const pollOnce = async (): Promise<MediaMetadata | null> => {
    try {
      const result = await deps.executor.run(
        "powershell",
        ["-NoProfile", "-Command", PS_GET_METADATA],
        { timeoutMs: 2_000 },
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
      await runScript(deps, PS_PLAY)
    },
    async pause() {
      await runScript(deps, PS_PAUSE)
    },
    async toggle() {
      await runScript(deps, PS_TOGGLE)
    },
    async next() {
      await runScript(deps, PS_NEXT)
    },
    async previous() {
      await runScript(deps, PS_PREV)
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
