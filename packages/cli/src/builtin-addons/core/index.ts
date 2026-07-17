import type { AddonManifestV1 } from "@/addon/api"

import actionBackend from "./buttons/action/backend"
import actionFrontend from "./buttons/action/frontend"
import changeDeckBackend from "./buttons/change-deck/backend"
import changeDeckFrontend from "./buttons/change-deck/frontend"
import mediaSampleBackend from "./buttons/media-sample/backend"
import mediaSampleFrontend from "./buttons/media-sample/frontend"
import pageNavBackend from "./buttons/page-nav/backend"
import pageNavFrontend from "./buttons/page-nav/frontend"
import toggleBackend from "./buttons/toggle/backend"
import toggleFrontend from "./buttons/toggle/frontend"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "core",
  buttonTypes: {
    "core:action": {
      frontend: actionFrontend,
      service: actionBackend,
    },
    "core:change-deck": {
      frontend: changeDeckFrontend,
      service: { ...changeDeckBackend, gestureHandlers: ["tap"] as const },
    },
    "core:toggle": {
      frontend: toggleFrontend,
      service: { ...toggleBackend, gestureHandlers: ["tap"] as const },
    },
    "core:page-nav": {
      frontend: pageNavFrontend,
      service: { ...pageNavBackend, gestureHandlers: ["tap", "hold"] as const },
    },
    "core:media-sample": {
      frontend: mediaSampleFrontend,
      service: { ...mediaSampleBackend, gestureHandlers: ["tap"] as const },
    },
  },
  decks: {
    "core:lock": ({ config }) => {
      const userButtons = (config as { lockButtons?: ReadonlyArray<Record<string, unknown>> })
        .lockButtons
      if (userButtons !== undefined && userButtons.length > 0) {
        return {
          name: "Lock",
          buttons: userButtons.map((b, i) => ({
            id: b.position !== undefined ? String(b.position) : `b${i}`,
            ...b,
          })) as unknown[],
        }
      }
      return {
        name: "Lock",
        buttons: [
          { id: "0", type: "date-time:locked-time-tile", config: { slot: "hour" } },
          { id: "1", type: "date-time:locked-time-tile", config: { slot: "separator" } },
          { id: "2", type: "date-time:locked-time-tile", config: { slot: "minute" } },
        ],
      }
    },
  },
}

export const coreAddon = manifest
export default manifest
export {
  actionBackend as actionButtonBackend,
  actionFrontend as ActionButtonFrontend,
  changeDeckBackend as changeDeckButtonBackend,
  changeDeckFrontend as ChangeDeckFrontend,
  toggleBackend as toggleButtonBackend,
  toggleFrontend as ToggleFrontend,
  pageNavBackend as pageNavButtonBackend,
  pageNavFrontend as PageNavFrontend,
  mediaSampleBackend as mediaSampleButtonBackend,
  mediaSampleFrontend as MediaSampleFrontend,
}
