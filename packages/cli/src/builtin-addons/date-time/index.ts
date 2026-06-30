import type { NewAddonManifest } from "@/addon/api";

import { AnalogClockButtonFrontend, analogClockButtonBackend } from "./buttons/analog-clock";
import { ClockButtonFrontend, clockButtonBackend } from "./buttons/clock";
import { DateButtonFrontend, dateButtonBackend } from "./buttons/date";
import { DateTimeButtonFrontend, dateTimeButtonBackend } from "./buttons/date-time";
import { LockedTimeTileButtonFrontend, lockedTimeTileButtonBackend } from "./buttons/locked-time-tile";
import { TimeButtonFrontend, timeButtonBackend } from "./buttons/time";
export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "date-time",
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
