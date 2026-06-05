import {
  createUnavailableMediaVolumeSnapshot,
  type MediaVolumeController,
  type MediaVolumeSnapshot,
} from './media-volume-controller.js'

export function createUnsupportedMediaVolumeController(
  source: string,
): MediaVolumeController {
  return {
    async getSnapshot(): Promise<MediaVolumeSnapshot> {
      return createUnavailableMediaVolumeSnapshot(source)
    },
    async getMuted(): Promise<boolean> {
      return false
    },
    async getVolumePercent(): Promise<number> {
      return 0
    },
    async setMuted(): Promise<boolean> {
      return false
    },
    async setVolume(): Promise<boolean> {
      return false
    },
  }
}
