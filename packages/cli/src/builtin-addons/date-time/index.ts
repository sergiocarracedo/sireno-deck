import {
  builtinAnalogClockButton,
  builtinClockButton,
} from './buttons/analog-clock.js'
import { builtinDateButton } from './buttons/calendar-sheet.js'
import {
  builtinDateTimeButton,
  builtinTimeButton,
} from './buttons/date-time.js'
import {
  builtinLockedTimeTileButton,
  formatLockedTimeCharacters,
  formatLockedTimeTileCharacter,
} from './buttons/locked-time-tile.js'
import { formatDigitalDateTimeLabel } from './format.js'
import {
  ANALOG_CLOCK_INTERVAL_MS,
  DATE_BUTTON_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
} from './schemas.js'

import type { SirenoAddon } from '../../addon/api.js'

const datetimeButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [
    builtinDateTimeButton,
    builtinLockedTimeTileButton,
    builtinAnalogClockButton,
    builtinClockButton,
    builtinDateButton,
    builtinTimeButton,
  ] as SirenoAddon['buttons'],
  name: 'date-time',
}

export default datetimeButtonsAddon

export {
  ANALOG_CLOCK_INTERVAL_MS,
  DATE_BUTTON_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  formatDigitalDateTimeLabel,
  formatLockedTimeCharacters,
  formatLockedTimeTileCharacter,
}
