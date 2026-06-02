import {
  createUnavailableMediaSnapshot,
  type MediaController,
} from './media-controller.js'

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
