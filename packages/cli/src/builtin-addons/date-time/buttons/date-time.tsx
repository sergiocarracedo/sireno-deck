import { defineMountedButton } from '../../../addon/api.js'
import { Text } from '../../../ui/index.js'
import { formatDigitalDateTimeLabel } from '../format.js'
import {
  BuiltinDisplayDateTimeButtonSchema,
  DIGITAL_DATE_TIME_INTERVAL_MS,
} from '../schemas.js'

export const BuiltinDateTimeButtonSchema = BuiltinDisplayDateTimeButtonSchema

export const builtinDateTimeButton = defineMountedButton({
  configSchema: BuiltinDateTimeButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ button, config }) => (
    <Text
      className="w-full"
      fit="wrap"
      size="xl"
      tone="foreground"
      typography="main"
    >
      {formatDigitalDateTimeLabel(config)}
    </Text>
  ),
  type: 'date-time',
})
