import {
  createUnavailableMediaSnapshot,
  type MediaController,
} from './media-controller'

export function createMacosMediaController(): MediaController {
  return {
    async getSnapshot() {
      return createUnavailableMediaSnapshot('macos-unsupported')
    },
    async togglePlayPause() {
      return false
    },
  }
}
