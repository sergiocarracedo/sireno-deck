import { defineMountedButton } from '@/addon/api'
import { Text } from '@/ui/index'
import {
  DIGITAL_DATE_TIME_INTERVAL_MS,
  LockedTimeTileButtonSchema,
  type LockedTimeTileButtonConfig,
} from '../schemas'

export function formatLockedTimeCharacters(
  date = new Date(),
): [string, string, string] {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return [hours, ':', minutes]
}

export function formatLockedTimeTileCharacter(
  slot: LockedTimeTileButtonConfig['slot'],
  date = new Date(),
): string {
  const [hours, separator, minutes] = formatLockedTimeCharacters(date)

  switch (slot) {
    case 'hour':
      return hours
    case 'hour-tens':
      return hours[0] ?? '0'
    case 'hour-ones':
      return hours[1] ?? '0'
    case 'separator':
      return separator
    case 'minute':
      return minutes
    case 'minute-tens':
      return minutes[0] ?? '0'
    case 'minute-ones':
      return minutes[1] ?? '0'
  }
}

export const builtinLockedTimeTileButton = defineMountedButton({
  configSchema: LockedTimeTileButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ config }) => {
    const character = formatLockedTimeTileCharacter(config.slot)
    const tone = character === ':' ? 'accent' : 'primary'

    return (
      <Text
        className="w-full"
        fit="wrap"
        tone={tone}
        typography="mono"
        size="2xl"
      >
        {character}
      </Text>
    )
  },
  type: 'locked-time-tile',
})
