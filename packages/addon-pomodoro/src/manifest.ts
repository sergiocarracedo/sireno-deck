import type { AddonManifestV1 } from "./types"

import { globalService } from "./global/backend"
import pomodoroBackend from "./buttons/pomodoro/backend"
import pomodoroFrontend from "./buttons/pomodoro/frontend"

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
