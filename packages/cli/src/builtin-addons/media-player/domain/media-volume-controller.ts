import type { HostContext } from '@/system/host-context'
import { createLinuxMediaVolumeController } from './linux-media-volume-controller'
import { createMacosMediaVolumeController } from './macos-media-volume-controller'
import { createUnsupportedMediaVolumeController } from './unsupported-media-volume-controller'
import { createWindowsMediaVolumeController } from './windows-media-volume-controller'

export interface MediaVolumeSnapshot {
  available: boolean
  muted: boolean
  percentage: number
  source: string
}

export interface MediaVolumeController {
  getMuted: () => Promise<boolean>
  getSnapshot: () => Promise<MediaVolumeSnapshot>
  getVolumePercent: () => Promise<number>
  setMuted: (muted: boolean) => Promise<boolean>
  setVolume: (deltaPercent: number) => Promise<boolean>
}

export function createUnavailableMediaVolumeSnapshot(
  source: string,
): MediaVolumeSnapshot {
  return { available: false, muted: false, percentage: 0, source }
}

export function createMediaVolumeController(options: {
  hostContext: HostContext
}): MediaVolumeController {
  switch (options.hostContext.os.type) {
    case 'linux':
      return createLinuxMediaVolumeController()
    case 'macos':
      return createMacosMediaVolumeController()
    case 'windows':
      return createWindowsMediaVolumeController()
    default:
      return createUnsupportedMediaVolumeController(
        `${options.hostContext.os.type}-unsupported`,
      )
  }
}
