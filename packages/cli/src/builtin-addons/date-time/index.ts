import { dateTimeAddon } from "./buttons/index.tsx";

export {
  builtinDateTimeButton,
  builtinTimeButton,
  builtinDateButton,
  builtinClockButton,
  builtinAnalogClockButton,
  builtinLockedTimeTileButton,
} from "./buttons/index.tsx";
export {
  BuiltinDateTimeButtonSchema,
  BuiltinTimePresetButtonSchema,
  BuiltinAnalogClockButtonSchema,
  BuiltinDateButtonSchema,
  BuiltinClockButtonSchema,
  LockedTimeTileButtonSchema,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  ANALOG_CLOCK_INTERVAL_MS,
  DATE_BUTTON_INTERVAL_MS,
  CLOCK_BUTTON_INTERVAL_MS,
} from "./schemas.ts";
export { formatDigitalDateTimeLabel } from "./format.ts";
export { createPoller } from "./poller.ts";
export type {
  BuiltinDisplayDateTimeButtonConfig,
  BuiltinTimePresetButtonConfig,
  BuiltinAnalogClockButtonConfig,
  BuiltinDateButtonConfig,
  BuiltinClockButtonConfig,
  LockedTimeTileButtonConfig,
} from "./schemas.ts";

export default dateTimeAddon;