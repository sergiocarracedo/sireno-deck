import {
  createUnavailableMediaSnapshot,
  type MediaController,
} from './media-controller'

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
