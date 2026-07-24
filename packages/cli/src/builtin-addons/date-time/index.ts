import type { AddonManifestV1 } from "@/addon/api"

import analogClockBackend from "./buttons/analog-clock/backend"
import analogClockFrontend from "./buttons/analog-clock/frontend"
import dateTimeBackend from "./buttons/custom/backend"
import dateTimeFrontend from "./buttons/custom/frontend"
import dateBackend from "./buttons/date/backend"
import dateFrontend from "./buttons/date/frontend"
import timeBackend from "./buttons/time/backend"
import timeFrontend from "./buttons/time/frontend"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "date-time",
  buttonTypes: {
    "date-time:date-time": {
      frontend: dateTimeFrontend,
      service: dateTimeBackend,
    },
    "date-time:time": { frontend: timeFrontend, service: timeBackend },
    "date-time:date": { frontend: dateFrontend, service: dateBackend },
    "date-time:analog-clock": {
      frontend: analogClockFrontend,
      service: analogClockBackend,
    },
  },
  publishIntervalMs: 1000,
}

export default manifest
