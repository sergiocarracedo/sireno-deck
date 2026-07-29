import type { AddonManifestV1 } from "./types.js"

import { globalService } from "./global/backend.js"
import pomodoroBackend from "./buttons/pomodoro/backend.js"
import pomodoroFrontend from "./buttons/pomodoro/frontend.js"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "pomodoro",
  buttonTypes: {
    "pomodoro:pomodoro": {
      frontend: pomodoroFrontend,
      service: {
        ...pomodoroBackend,
        gestureHandlers: ["tap"],
      },
    },
  },
  globalService,
} satisfies AddonManifestV1

export default manifest
