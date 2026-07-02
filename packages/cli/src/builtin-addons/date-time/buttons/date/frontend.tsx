import type { AddonFrontendButton } from '@/addon/api'

import { Chip, Text } from '@/ui'
import { formatDateParts } from '../../shared/format-date'
import { useNow } from '../../shared/use-now'
import { ConfigSchema } from './config'

const INTERVAL_MS = 60000

const DateButtonFrontend: AddonFrontendButton<ConfigSchema> = ({ config }) => {
  const now = useNow(INTERVAL_MS)
  const { day, month, weekday, year } = formatDateParts(
    {
      ...config,
      weekDayFormat: 'short',
      yearFormat: '2-digit',
    },
    now,
  )
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
      <Chip tone="primary" size="md">
        {month}
      </Chip>
      <Text
        size="4xl"
        lineHeight="1em"
        tone="fg"
        typography="main"
        weight="bold"
      >
        {day}
      </Text>
      <Text tone="muted" size="md" typography="main" weight="semibold">
        {weekday}
      </Text>
    </span>
  )
}

export default DateButtonFrontend
