import {
  createUnavailableMediaSnapshot,
  type MediaController,
} from './media-controller.js'

export function createMacosMediaController(): MediaController {
  return {
    async getSnapshot() {
      // The macOS adapter entry point stays explicit even while deeper AppleScript
      // or MediaRemote validation is still pending, so unsupported hosts degrade honestly.
      return createUnavailableMediaSnapshot('macos-unsupported')
    },
    async togglePlayPause() {
      return false
    },
  }
}
