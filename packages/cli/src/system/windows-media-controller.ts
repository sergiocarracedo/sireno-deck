import {
  createUnavailableMediaSnapshot,
  type MediaController,
} from './media-controller.js'

export function createWindowsMediaController(): MediaController {
  return {
    async getSnapshot() {
      // Keep the Windows entry point honest until a verified
      // GlobalSystemMediaTransportControlsSessionManager adapter lands.
      return createUnavailableMediaSnapshot('windows-unsupported')
    },
    async togglePlayPause() {
      return false
    },
  }
}
