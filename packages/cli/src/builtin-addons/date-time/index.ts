import type { NewAddonManifest } from '@/addon/api'

import manifestJson from './sirenodeck.json' with { type: 'json' }

import analogClockBackend from './buttons/analog-clock/backend'
import analogClockFrontend from './buttons/analog-clock/frontend'
import clockBackend from './buttons/clock/backend'
import clockFrontend from './buttons/clock/frontend'
import dateBackend from './buttons/date/backend'
import dateFrontend from './buttons/date/frontend'
import dateTimeBackend from './buttons/custom/backend'
import dateTimeFrontend from './buttons/custom/frontend'
import lockedTimeTileBackend from './buttons/locked-time-tile/backend'
import lockedTimeTileFrontend from './buttons/locked-time-tile/frontend'
import timeBackend from './buttons/time/backend'
import timeFrontend from './buttons/time/frontend'

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    'date-time:date-time': { frontend: dateTimeFrontend, backend: dateTimeBackend },
    'date-time:time': { frontend: timeFrontend, backend: timeBackend },
    'date-time:date': { frontend: dateFrontend, backend: dateBackend },
    'date-time:clock': { frontend: clockFrontend, backend: clockBackend },
    'date-time:analog-clock': {
      frontend: analogClockFrontend,
      backend: analogClockBackend,
    },
    'date-time:locked-time-tile': {
      frontend: lockedTimeTileFrontend,
      backend: lockedTimeTileBackend,
    },
  },
  publishIntervalMs: 1000,
}

export const dateTimeAddon = manifest
export default manifest
