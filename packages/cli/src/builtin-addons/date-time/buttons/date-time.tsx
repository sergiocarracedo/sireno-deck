import { defineMountedButton } from '../../../addon/api.js'
import { Text } from '../../../ui/index.js'
import {
  BuiltinDisplayDateTimeButtonSchema,
  DIGITAL_DATE_TIME_INTERVAL_MS,
} from '../schemas.js'
import { formatDigitalDateTimeLabel } from '../format.js'

export const BuiltinDateTimeButtonSchema = BuiltinDisplayDateTimeButtonSchema

export const builtinDateTimeButton = defineMountedButton({
  configSchema: BuiltinDateTimeButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ button, config }) => (
    <div className="font-main text-foreground">
      <Text className="w-full fit-wrap leading-1">
        {formatDigitalDateTimeLabel(config)}
      </Text>
    </div>
  ),
  type: 'date-time',
})
