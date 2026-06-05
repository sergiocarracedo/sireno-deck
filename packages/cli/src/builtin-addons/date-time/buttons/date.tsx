import { ButtonSurface, defineMountedButton } from '../../../addon/api.js'
import { Text } from '../../../ui/index.js'
import {
  BuiltinDateButtonSchema,
  DATE_BUTTON_INTERVAL_MS,
  type BuiltinDateButtonConfig,
} from '../schemas.js'

function formatDateParts(
  config: BuiltinDateButtonConfig,
  date: Date,
): { day: string; month: string; weekday: string } {
  const locale = config.locale ?? 'en-US'
  const timeZone = config.time_zone
  const monthFmt = new Intl.DateTimeFormat(locale, {
    month: 'short',
    ...(timeZone ? { timeZone } : {}),
  })
  const dayFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  })
  const weekdayFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    ...(timeZone ? { timeZone } : {}),
  })
  return {
    day: dayFmt.format(date),
    month: monthFmt.format(date).toUpperCase(),
    weekday: weekdayFmt.format(date).toUpperCase(),
  }
}

export const builtinDateButton = defineMountedButton({
  configSchema: BuiltinDateButtonSchema,
  defaultIntervalMs: DATE_BUTTON_INTERVAL_MS,
  render: ({ config }) => {
    const { day, month, weekday } = formatDateParts(config, new Date())
    return (
      <ButtonSurface>
        <div className="flex h-full w-full flex-col items-center justify-center gap-0 leading-[0.70]">
          <Text
            size="sm"
            tone="accent"
            className="border-accent bg-accent/20 px-1 py-0.5 rounded-full leading-[1em]"
          >
            {month}
          </Text>
          <Text size="3xl" tone="primary" className="-mt-1">
            {day}
          </Text>
          <Text size="md" tone="foreground">
            {weekday}
          </Text>
        </div>
      </ButtonSurface>
    )
  },
  type: 'date',
})
