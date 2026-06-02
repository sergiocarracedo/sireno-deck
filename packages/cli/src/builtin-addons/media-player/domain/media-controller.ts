import type { HostContext } from '../../../system/host-context.js'

import {
  createLinuxMediaController,
  type LinuxMediaControllerClient,
} from './linux-media-controller.js'
import { createMacosMediaController } from './macos-media-controller.js'
import { createWindowsMediaController } from './windows-media-controller.js'

export type MediaPlaybackStatus = 'pause' | 'play' | 'stop'

export interface MediaControllerSnapshot {
  app?: string
  artist?: string
  available: boolean
  durationSeconds?: number
  percentage?: number
  positionSeconds?: number
  source: string
  status?: MediaPlaybackStatus
  title?: string
}

export interface MediaController {
  getSnapshot: () => Promise<MediaControllerSnapshot>
  togglePlayPause: () => Promise<boolean>
}

export interface MediaControllerOptions {
  hostContext: HostContext
  linuxClient?: LinuxMediaControllerClient
}

export function createUnavailableMediaSnapshot(source: string): MediaControllerSnapshot {
  return {
    available: false,
    source,
  }
}

function createUnsupportedController(source: string): MediaController {
  return {
    async getSnapshot() {
      return createUnavailableMediaSnapshot(source)
    },
    async togglePlayPause() {
      return false
    },
  }
}

export function createMediaController(options: MediaControllerOptions): MediaController {
  switch (options.hostContext.os.type) {
    case 'linux':
      return createLinuxMediaController(options.linuxClient)
    case 'macos':
      return createMacosMediaController()
    case 'windows':
      return createWindowsMediaController()
    default:
      return createUnsupportedController(`${options.hostContext.os.type}-unsupported`)
  }
}
