import type { NewAddonManifest } from "@/addon/api";

import { dateTimeButtonBackend } from "./buttons/date-time";
import { timeButtonBackend } from "./buttons/time";
import { dateButtonBackend } from "./buttons/date";
import { clockButtonBackend } from "./buttons/clock";
import { analogClockButtonBackend } from "./buttons/analog-clock";
import { lockedTimeTileButtonBackend } from "./buttons/locked-time-tile";
import { DateTimeButtonFrontend } from "./buttons/date-time.frontend";
import { TimeButtonFrontend } from "./buttons/time.frontend";
import { DateButtonFrontend } from "./buttons/date.frontend";
import { ClockButtonFrontend } from "./buttons/clock.frontend";
import { AnalogClockButtonFrontend } from "./buttons/analog-clock.frontend";
import { LockedTimeTileButtonFrontend } from "./buttons/locked-time-tile.frontend";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "date-time",
  frontend: { main: "./index" },
  buttonTypes: {
    "core:date-time": {
      frontend: DateTimeButtonFrontend,
      backend: dateTimeButtonBackend,
    },
    "core:time": {
      frontend: TimeButtonFrontend,
      backend: timeButtonBackend,
    },
    "core:date": {
      frontend: DateButtonFrontend,
      backend: dateButtonBackend,
    },
    "core:clock": {
      frontend: ClockButtonFrontend,
      backend: clockButtonBackend,
    },
    "core:analog-clock": {
      frontend: AnalogClockButtonFrontend,
      backend: analogClockButtonBackend,
    },
    "core:locked-time-tile": {
      frontend: LockedTimeTileButtonFrontend,
      backend: lockedTimeTileButtonBackend,
    },
  },
  publishIntervalMs: 1000,
};

export const dateTimeAddon = manifest;
export default dateTimeAddon;
export const DateTimeButtonBackend = dateTimeButtonBackend;
export const TimeButtonBackend = timeButtonBackend;
export const DateButtonBackend = dateButtonBackend;
export const ClockButtonBackend = clockButtonBackend;
export const AnalogClockButtonBackend = analogClockButtonBackend;
export const LockedTimeTileButtonBackend = lockedTimeTileButtonBackend;
