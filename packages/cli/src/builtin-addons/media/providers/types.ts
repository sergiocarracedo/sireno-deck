export type PlayStatus = "play" | "pause" | "stop" | "unavailable"

export interface MediaTrack {
  readonly name: string
  readonly artist: string
  readonly album?: string
}

export interface MediaStatus {
  readonly track: MediaTrack | null
  readonly totalTime: number
  readonly currentTime: number
  readonly playStatus: PlayStatus
  readonly volume: number
  readonly muted: boolean
}

export interface MediaStatusProvider {
  getStatus(): Promise<MediaStatus>
  play(): Promise<void>
  pause(): Promise<void>
  toggle(): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
  setVolume(value: number): Promise<void>
  volumeUp(step: number): Promise<void>
  volumeDown(step: number): Promise<void>
  toggleMute(): Promise<void>
}

export interface StatusProviderDeps {
  readonly executor: ProviderExecutor
}

export interface ProviderExecutor {
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

export const DEFAULT_TIMEOUT_MS = 5_000
export const ONCHANGE_POLL_MS = 2_000
