import { execa } from 'execa'

import {
  createUnavailableMediaVolumeSnapshot,
  type MediaVolumeController,
  type MediaVolumeSnapshot,
} from './media-volume-controller'

const SINK = '@DEFAULT_SINK@'

export function createLinuxMediaVolumeController(): MediaVolumeController {
  async function getMuted(): Promise<boolean> {
    try {
      const result = await execa('pactl', ['get-sink-mute', SINK])
      return /yes/i.test(result.stdout)
    } catch {
      return false
    }
  }

  async function getVolumePercent(): Promise<number> {
    try {
      const result = await execa('pactl', ['get-sink-volume', SINK])
      const match = /(\d+)%/.exec(result.stdout)
      if (!match) return 0
      return Math.min(100, Math.max(0, Number(match[1])))
    } catch {
      return 0
    }
  }

  return {
    async getSnapshot(): Promise<MediaVolumeSnapshot> {
      try {
        const [muted, percentage] = await Promise.all([
          getMuted(),
          getVolumePercent(),
        ])
        return { available: true, muted, percentage, source: 'pactl' }
      } catch {
        return createUnavailableMediaVolumeSnapshot('pactl-unavailable')
      }
    },
    getMuted,
    getVolumePercent,
    async setMuted(muted: boolean): Promise<boolean> {
      try {
        await execa('pactl', [
          'set-sink-mute',
          SINK,
          muted ? '1' : '0',
        ])
        return true
      } catch {
        return false
      }
    },
    async setVolume(deltaPercent: number): Promise<boolean> {
      try {
        const sign = deltaPercent >= 0 ? '+' : ''
        await execa('pactl', [
          'set-sink-volume',
          SINK,
          `${sign}${deltaPercent}%`,
        ])
        return true
      } catch {
        return false
      }
    },
  }
}
