import { execa } from 'execa'

import {
  createUnavailableMediaVolumeSnapshot,
  type MediaVolumeController,
  type MediaVolumeSnapshot,
} from './media-volume-controller.js'

export function createMacosMediaVolumeController(): MediaVolumeController {
  async function getMuted(): Promise<boolean> {
    try {
      const result = await execa('osascript', [
        '-e',
        'output muted of (get volume settings)',
      ])
      return /true/i.test(result.stdout.trim())
    } catch {
      return false
    }
  }

  async function getVolumePercent(): Promise<number> {
    try {
      const result = await execa('osascript', [
        '-e',
        'output volume of (get volume settings)',
      ])
      const value = Number(result.stdout.trim())
      if (Number.isNaN(value)) return 0
      return Math.min(100, Math.max(0, value))
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
        return { available: true, muted, percentage, source: 'osascript' }
      } catch {
        return createUnavailableMediaVolumeSnapshot('osascript-unavailable')
      }
    },
    getMuted,
    getVolumePercent,
    async setMuted(muted: boolean): Promise<boolean> {
      try {
        await execa('osascript', [
          '-e',
          `set volume output muted to ${muted ? 'true' : 'false'}`,
        ])
        return true
      } catch {
        return false
      }
    },
    async setVolume(deltaPercent: number): Promise<boolean> {
      try {
        const current = await getVolumePercent()
        const next = Math.min(100, Math.max(0, current + deltaPercent))
        await execa('osascript', [
          '-e',
          `set volume output volume ${next}`,
        ])
        return true
      } catch {
        return false
      }
    },
  }
}
