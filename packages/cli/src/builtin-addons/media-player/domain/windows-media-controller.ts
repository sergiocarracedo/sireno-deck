import {
  createUnavailableMediaSnapshot,
  type MediaController,
} from './media-controller.js'

export function createWindowsMediaController(): MediaController {
  return {
    async getSnapshot() {
      return createUnavailableMediaSnapshot('windows-unsupported')
    },
    async togglePlayPause() {
      return false
    },
  }
}
