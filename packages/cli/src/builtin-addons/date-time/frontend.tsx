import { useNow } from './use-now'
import { useAddonChannel } from 'sireno-deck/react'
import { Text, Chip } from '@/ui/index'

interface ComponentProps {
  readonly config: unknown
  readonly state: unknown
  readonly buttonType?: string
}

const formatDateParts = (date: Date) => {
  const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short' })
  const dayFmt = new Intl.DateTimeFormat('en-US', { day: 'numeric' })
  const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
  return {
    day: dayFmt.format(date),
    month: monthFmt.format(date).toUpperCase(),
    weekday: weekdayFmt.format(date).toUpperCase(),
  }
}

const ChannelNow = ({
  children,
}: {
  children: (now: Date) => React.ReactNode
}) => {
  const { data } = useAddonChannel<{ now: number }>('date-time:now')
  const tickNow = useNow(1000)
  const fallbackNow = data?.now ? new Date(data.now) : tickNow
  return <>{children(fallbackNow)}</>
}

const NBSP = '\u00A0'

const CoreTime = ({ config }: ComponentProps) => {
  const { variant } = (config as { variant?: 'default' | 'big' }) ?? {}
  return (
    <ChannelNow>
      {(now) => {
        const hh = String(now.getHours()).padStart(2, '0')
        const mm = String(now.getMinutes()).padStart(2, '0')
        const big = variant === 'big'
        return (
          <Text
            size={big ? 'xl' : 'lg'}
            typography="main"
            tone="fg"
            fit="wrap"
            lineHeight={big ? 0.8 : 1}
          >
            {big
              ? `<3xl>${NBSP}*${hh}*<blink>.</blink>|${NBSP}${mm}${NBSP}</3xl>`
              : `*${hh}*<blink>:</blink>${mm}`}
          </Text>
        )
      }}
    </ChannelNow>
  )
}

const CoreDate = () => (
  <ChannelNow>
    {(now) => {
      const { day, month, weekday } = formatDateParts(now)
      return (
        <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <Chip tone="accent" size="sm">
            {month}
          </Chip>
          <Text
            size="3xl"
            tone="fg"
            typography="main"
            fit="shrink"
            className="font-semibold leading-none"
          >
            {day}
          </Text>
          <Text
            size="xs"
            tone="muted"
            typography="aux"
            fit="shrink"
            className="uppercase tracking-wider"
          >
            {weekday}
          </Text>
        </span>
      )
    }}
  </ChannelNow>
)

const CoreClock = ({ config }: ComponentProps) => {
  const { showSeconds } = (config as { showSeconds?: boolean }) ?? {}
  return (
    <ChannelNow>
      {(now) => {
        const hh = String(now.getHours()).padStart(2, '0')
        const mm = String(now.getMinutes()).padStart(2, '0')
        const ss = String(now.getSeconds()).padStart(2, '0')
        return (
          <Text size="lg" typography="mono" tone="fg" fit="shrink">
            {showSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`}
          </Text>
        )
      }}
    </ChannelNow>
  )
}

const CoreAnalogClock = () => (
  <ChannelNow>
    {(now) => {
      const h = now.getHours() % 12
      const m = now.getMinutes()
      const s = now.getSeconds()
      const hourAngle = (h + m / 60) * 30
      const minuteAngle = (m + s / 60) * 6
      return (
        <span className="block h-full w-full" data-sireno-ui-text="true">
          <svg
            aria-label="Analog clock"
            className="h-full w-full"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="41"
              fill="none"
              stroke="var(--color-fg)/24"
              strokeWidth="2"
            />
            <g
              data-sireno-clock-minute-hand="true"
              style={{
                transform: `rotate(${minuteAngle}deg)`,
                transformOrigin: '50% 50%',
              }}
            >
              <line
                stroke="color-mix(in srgb, var(--color-fg) 68%, transparent)"
                strokeLinecap="round"
                strokeWidth="3.4"
                x1="50"
                x2="50"
                y1="50"
                y2="21"
              />
            </g>
            <g
              data-sireno-clock-hour-hand="true"
              style={{
                transform: `rotate(${hourAngle}deg)`,
                transformOrigin: '50% 50%',
              }}
            >
              <line
                stroke="var(--color-primary)"
                strokeLinecap="round"
                strokeWidth="3"
                x1="50"
                x2="50"
                y1="50"
                y2="29"
              />
            </g>
            <circle cx="50" cy="50" r="3.6" fill="var(--color-fg)" />
          </svg>
        </span>
      )
    }}
  </ChannelNow>
)

const expandTokens = (source: string, now: Date): string => {
  const map: Record<string, string> = {
    YY: String(now.getFullYear() % 100).padStart(2, '0'),
    YYYY: String(now.getFullYear()),
    M: String(now.getMonth() + 1),
    MM: String(now.getMonth() + 1).padStart(2, '0'),
    MMM: now.toLocaleString('en-US', { month: 'short' }),
    D: String(now.getDate()),
    DD: String(now.getDate()).padStart(2, '0'),
    d: String(now.getDay()),
    ddd: now.toLocaleString('en-US', { weekday: 'short' }),
    H: String(now.getHours()),
    HH: String(now.getHours()).padStart(2, '0'),
    m: String(now.getMinutes()),
    mm: String(now.getMinutes()).padStart(2, '0'),
    s: String(now.getSeconds()),
    ss: String(now.getSeconds()).padStart(2, '0'),
    A: now.getHours() < 12 ? 'AM' : 'PM',
    a: now.getHours() < 12 ? 'am' : 'pm',
  }
  const sorted = Object.keys(map).sort((a, b) => b.length - a.length)
  let result = ''
  let i = 0
  while (i < source.length) {
    if (source[i] === '<') {
      const end = source.indexOf('>', i + 1)
      const close = source.indexOf('</', i + 1)
      if (end !== -1 && (close === -1 || end < close)) {
        result += source.slice(i, end + 1)
        i = end + 1
        continue
      }
    }
    if (source[i] === '<' && source.startsWith('</', i)) {
      const end = source.indexOf('>', i + 2)
      if (end !== -1) {
        result += source.slice(i, end + 1)
        i = end + 1
        continue
      }
    }
    let matched = false
    for (const token of sorted) {
      if (source.startsWith(token, i)) {
        result += map[token]
        i += token.length
        matched = true
        break
      }
    }
    if (!matched) {
      result += source[i]
      i += 1
    }
  }
  return result
}

const CoreDateTime = ({ config }: ComponentProps) => {
  const { format } = (config as { format?: string }) ?? {}
  const pattern = format ?? 'DD/MM/YYYY HH:mm:ss'
  return (
    <ChannelNow>
      {(now) => (
        <Text
          size="xs"
          typography="mono"
          tone="fg"
          fit="shrink"
          className="px-1"
        >
          {expandTokens(pattern, now)}
        </Text>
      )}
    </ChannelNow>
  )
}

const CoreLockedTimeTile = ({ config }: ComponentProps) => {
  const { slot } = (config as { slot?: string }) ?? {}
  return (
    <ChannelNow>
      {(now) => {
        const hh = String(now.getHours()).padStart(2, '0')
        const mm = String(now.getMinutes()).padStart(2, '0')
        const map: Record<string, string> = {
          hour: hh[0] ?? '',
          'hour-tens': hh[0] ?? '',
          'hour-ones': hh[1] ?? '',
          separator: ':',
          minute: mm[0] ?? '',
          'minute-tens': mm[0] ?? '',
          'minute-ones': mm[1] ?? '',
        }
        return (
          <Text
            size="2xl"
            typography="mono"
            tone="fg"
            className="flex h-full w-full items-center justify-center"
          >
            {map[slot ?? 'hour'] ?? ''}
          </Text>
        )
      }}
    </ChannelNow>
  )
}

const Component = (props: ComponentProps) => {
  const type = (props as { buttonType?: string }).buttonType
  if (type === 'core:date') return <CoreDate />
  if (type === 'core:clock') return <CoreClock config={props.config} />
  if (type === 'core:analog-clock') return <CoreAnalogClock />
  if (type === 'core:date-time') return <CoreDateTime config={props.config} />
  if (type === 'core:locked-time-tile')
    return <CoreLockedTimeTile config={props.config} />
  return <CoreTime config={props.config} />
}

export default Component
