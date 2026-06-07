import { execa } from 'execa'

import {
  createUnavailableMediaSnapshot,
  type MediaController,
  type MediaControllerSnapshot,
  type MediaPlaybackStatus,
} from './media-controller'

interface LinuxMediaCommandResult {
  exitCode: number | null
  failed: boolean
  stderr: string
  stdout: string
  timedOut: boolean
}

export interface LinuxMediaControllerClient {
  run: (args: string[]) => Promise<LinuxMediaCommandResult>
}

const PLAYERCTL_SOURCE = 'linux-playerctl'

const defaultClient: LinuxMediaControllerClient = {
  async run(args) {
    const result = await execa('playerctl', args, {
      reject: false,
      timeout: 1_000,
    })

    return {
      exitCode: result.exitCode ?? null,
      failed: result.failed,
      stderr: result.stderr.trim(),
      stdout: result.stdout.trim(),
      timedOut: result.timedOut,
    }
  },
}

function isFailure(result: LinuxMediaCommandResult): boolean {
  return result.failed || result.timedOut || result.exitCode !== 0
}

function normalizeString(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : undefined
}

function parsePlaybackStatus(value: string | undefined): MediaPlaybackStatus | undefined {
  switch (value?.trim().toLowerCase()) {
    case 'playing':
      return 'play'
    case 'paused':
      return 'pause'
    case 'stopped':
      return 'stop'
    default:
      return undefined
  }
}

function parseSeconds(value: string | undefined): number | undefined {
  const numeric = Number.parseFloat(value ?? '')
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined
}

function parseMicroseconds(value: string | undefined): number | undefined {
  const numeric = Number.parseFloat(value ?? '')
  return Number.isFinite(numeric) && numeric > 0 ? numeric / 1_000_000 : undefined
}

function clampPercentage(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

function parseMetadata(stdout: string | undefined): {
  app?: string
  artist?: string
  durationSeconds?: number
  title?: string
} {
  const [app, artist, title, durationRaw] = (stdout ?? '').split('|||')

  return {
    app: normalizeString(app),
    artist: normalizeString(artist),
    durationSeconds: parseMicroseconds(durationRaw),
    title: normalizeString(title),
  }
}

export function createLinuxMediaController(
  client: LinuxMediaControllerClient = defaultClient,
): MediaController {
  return {
    async getSnapshot(): Promise<MediaControllerSnapshot> {
      const [statusResult, metadataResult, positionResult] = await Promise.all([
        client.run(['status']),
        client.run(['metadata', '--format', '{{playerName}}|||{{artist}}|||{{title}}|||{{mpris:length}}']),
        client.run(['position']),
      ])

      if (isFailure(statusResult)) {
        return createUnavailableMediaSnapshot(PLAYERCTL_SOURCE)
      }

      const status = parsePlaybackStatus(statusResult.stdout)
      if (!status) {
        return createUnavailableMediaSnapshot(PLAYERCTL_SOURCE)
      }

      const metadata = isFailure(metadataResult)
        ? {}
        : parseMetadata(metadataResult.stdout)
      const positionSeconds = isFailure(positionResult)
        ? undefined
        : parseSeconds(positionResult.stdout)
      const percentage = metadata.durationSeconds && positionSeconds !== undefined
        ? clampPercentage((positionSeconds / metadata.durationSeconds) * 100)
        : undefined

      return {
        ...metadata,
        available: true,
        ...(percentage !== undefined ? { percentage } : {}),
        ...(positionSeconds !== undefined ? { positionSeconds } : {}),
        source: PLAYERCTL_SOURCE,
        status,
      }
    },
    async togglePlayPause(): Promise<boolean> {
      const result = await client.run(['play-pause'])
      return !isFailure(result)
    },
  }
}
