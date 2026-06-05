import { useEffect, useState } from 'react'

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
  defaultRenderIntervalMs: DATE_BUTTON_INTERVAL_MS,
  render: ({ config }) => {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), DATE_BUTTON_INTERVAL_MS)
      return () => clearInterval(id)
    }, [])
    const { day, month, weekday } = formatDateParts(config, now)
    return (
      <ButtonSurface full>
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <Text size="xs" tone="accent">
            {month}
          </Text>
          <Text size="xl" tone="primary">
            {day}
          </Text>
          <Text size="xs" tone="foreground">
            {weekday}
          </Text>
        </div>
      </ButtonSurface>
    )
  },
  type: 'date',
})
