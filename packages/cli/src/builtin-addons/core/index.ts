import type { AddonManifestV1 } from "@/addon/api"
import { positionButtons } from "@/deck/position-buttons"

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
import { globalService as toggleGlobalService } from "./buttons/toggle/global-service"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "core",
  buttonTypes: {
    "core:action": {
      frontend: actionFrontend,
      // ponytail: gestureHandlers: ['tap'] is REQUIRED for type:// macros and any
      // addon-deck button that uses actions.tap. The addon registry's default-deny
      // policy strips undeclared handlers — without this, taps silently no-op.
      service: { ...actionBackend, gestureHandlers: ["tap"] as const },
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
  globalService: toggleGlobalService,
  decks: [
    {
      id: "core:lock",
      createDecks: ({ config, keyCount }) => {
        const userButtons = (
          config as { lockButtons?: ReadonlyArray<Record<string, unknown>> }
        ).lockButtons

        const centerButton = Math.floor(keyCount / 2)

        // ponytail: default buttons omit `id` — the schema is `.strict()` and
        // rejects unknown keys, and the runtime re-assigns `id` from `position`
        // via `positionButtons` in run.ts. Spelling `id` here just emits
        // "Unrecognized key: 'id'" warnings at startup (3 of them per daemon).
        const defaultButtons = [
          {
            type: "date-time",
            config: { format: "<strong><5xl>HH</5xl></strong>" },
            position: centerButton - 1,
            full: true,
          },
          {
            type: "date-time",
            config: { format: "<strong><5xl><blink>:</blink></5xl></strong>" },
            position: centerButton,
            full: true,
          },
          {
            type: "date-time",
            config: { format: "<strong><5xl>mm</5xl></strong>" },
            position: centerButton + 1,
            full: true,
          },
        ]

        return {
          "core:lock": {
            name: "Lock",
            buttons:
              userButtons !== undefined && userButtons.length > 0
                ? positionButtons(
                    userButtons as Array<{ position?: number }>,
                    keyCount,
                  ).map((b, i) => {
                    // ponytail: strip the user-supplied `id` (if any) before
                    // spreading. The button schema is `.strict()` and rejects
                    // unknown keys; without this, the runtime emits
                    // "Unrecognized key: 'id'" warnings for each user button.
                    const { id: _userId, ...rest } = b
                    return {
                      id:
                        b.position !== undefined ? String(b.position) : `b${i}`,
                      ...rest,
                    }
                  })
                : defaultButtons,
          },
        }
      },
    },
  ],
}

export const coreAddon = manifest
export default manifest
export {
  actionBackend as actionButtonBackend,
  actionFrontend as ActionButtonFrontend,
  changeDeckBackend as changeDeckButtonBackend,
  changeDeckFrontend as ChangeDeckFrontend,
  mediaSampleBackend as mediaSampleButtonBackend,
  mediaSampleFrontend as MediaSampleButtonFrontend,
  pageNavBackend as pageNavButtonBackend,
  pageNavFrontend as PageNavFrontend,
  toggleBackend as toggleButtonBackend,
  toggleFrontend as ToggleButtonFrontend,
}
