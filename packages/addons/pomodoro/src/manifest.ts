// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
import type { AddonManifestV1 } from "./types.js"

import { globalService } from "./global/backend.js"
import pomodoroBackend from "./buttons/pomodoro/backend.js"
// ponytail: `.js` (not `.tsx`) because TypeScript with `moduleResolution:
// "Bundler"` resolves `.js` to `.tsx` source files, and `allowImportingTsExtensions`
// is off. The output of tsdown is `.js` anyway, so the runtime path is `.js`.
import pomodoroFrontend from "./buttons/pomodoro/frontend.js"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "pomodoro",
  buttonTypes: {
    "pomodoro:pomodoro": {
      frontend: pomodoroFrontend,
      service: {
        ...pomodoroBackend,
        gestureHandlers: ["tap", "hold"],
      },
    },
  },
  globalService,
} satisfies AddonManifestV1

export default manifest
