import type { AddonManifestV1 } from "@/addon/api"

import { globalService } from "./backend"
import pomodoroBackend from "./buttons/pomodoro/backend"
import pomodoroFrontend from "./buttons/pomodoro/frontend"

export { globalService }

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "pomodoro",
  buttonTypes: {
    "pomodoro:pomodoro": {
      frontend: pomodoroFrontend,
      service: {
        ...pomodoroBackend,
        gestureHandlers: ["tap"] as const,
      },
    },
  },
  globalService,
}

export const pomodoroAddon = manifest
export default manifest