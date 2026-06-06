import {
  builtinAnalogClockButton,
  builtinClockButton,
} from './buttons/analog-clock'
import { builtinDateButton } from './buttons/date'
import { builtinDateTimeButton, builtinTimeButton } from './buttons/date-time'
import {
  builtinLockedTimeTileButton,
  formatLockedTimeCharacters,
  formatLockedTimeTileCharacter,
} from './buttons/locked-time-tile'
import { formatDigitalDateTimeLabel } from './format'
import {
  ANALOG_CLOCK_INTERVAL_MS,
  DATE_BUTTON_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
} from './schemas'

import type { SirenoAddon } from '@/addon/api'

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
