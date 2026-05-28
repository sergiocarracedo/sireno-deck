import { defineMountedButton } from '../../../addon/api.js'
import { Text } from '../../../ui/index.js'
import {
  DIGITAL_DATE_TIME_INTERVAL_MS,
  LockedTimeTileButtonSchema,
  type LockedTimeTileButtonConfig,
} from '../schemas.js'

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
    case 'separator':
      return separator
    case 'minute':
      return minutes
  }
}

export const builtinLockedTimeTileButton = defineMountedButton({
  configSchema: LockedTimeTileButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ config }) => {
    const character = formatLockedTimeTileCharacter(config.slot)
    const tone = character === ':' ? 'accent' : 'primary'

    return (
      <span
        className={`block font-mono ${tone === 'accent' ? 'text-accent' : 'text-primary'}`}
      >
        <Text
          className="w-full"
          fit="wrap"
          tone={tone}
          typography="mono"
          size="2xl"
        >
          {character}
        </Text>
      </span>
    )
  },
  type: 'locked-time-tile',
})
