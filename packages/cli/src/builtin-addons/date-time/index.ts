import type { NewAddonManifest } from "@/addon/api";

import manifestJson from "./sirenodeck.json" with { type: "json" };

import analogClockBackend from "./buttons/analog-clock/backend";
import analogClockFrontend from "./buttons/analog-clock/frontend";
import clockBackend from "./buttons/clock/backend";
import clockFrontend from "./buttons/clock/frontend";
import dateBackend from "./buttons/date/backend";
import dateFrontend from "./buttons/date/frontend";
import dateTimeBackend from "./buttons/date-time/backend";
import dateTimeFrontend from "./buttons/date-time/frontend";
import lockedTimeTileBackend from "./buttons/locked-time-tile/backend";
import lockedTimeTileFrontend from "./buttons/locked-time-tile/frontend";
import timeBackend from "./buttons/time/backend";
import timeFrontend from "./buttons/time/frontend";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    "core:date-time": { frontend: dateTimeFrontend, backend: dateTimeBackend },
    "core:time": { frontend: timeFrontend, backend: timeBackend },
    "core:date": { frontend: dateFrontend, backend: dateBackend },
    "core:clock": { frontend: clockFrontend, backend: clockBackend },
    "core:analog-clock": {
      frontend: analogClockFrontend,
      backend: analogClockBackend,
    },
    "core:locked-time-tile": {
      frontend: lockedTimeTileFrontend,
      backend: lockedTimeTileBackend,
    },
  },
  publishIntervalMs: 1000,
};

export const dateTimeAddon = manifest;
export default manifest;