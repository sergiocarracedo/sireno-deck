import { defineMountedButton } from '@/addon/api'
import { cn } from '@/themes/utils/cn'
import { Text } from '@/ui'
import { formatDigitalDateTimeLabel } from '../format'
import {
  BuiltinDateTimeButtonSchema,
  BuiltinTimePresetButtonSchema,
  DIGITAL_DATE_TIME_INTERVAL_MS,
} from '../schemas'

const DateTimeLabel = ({
  format,
  className,
  style,
}: {
  format: string
  className?: string
  style?: React.CSSProperties
}) => {
  return (
    <Text
      className={cn(['w-full', className])}
      fit="wrap"
      size="xl"
      tone="foreground"
      typography="main"
      style={style}
      lineHeight={1}
    >
      {formatDigitalDateTimeLabel(format)}
    </Text>
  )
}

export const builtinDateTimeButton = defineMountedButton({
  configSchema: BuiltinDateTimeButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ button, config }) => {
    const format = config.format ?? '*HH*<blink>:</blink>mm'
    return <DateTimeLabel format={format} />
  },
  type: 'date-time',
})

export const builtinTimeButton = defineMountedButton({
  configSchema: BuiltinTimePresetButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ button, config }) => {
    const variants: Record<
      NonNullable<typeof config.variant>,
      { format: string; className?: string; style?: React.CSSProperties }
    > = {
      big: {
        format: `<3xl> *HH*<blink>.</blink>| mm </3xl>`,
        className: 'leading-[0.80]',
      },
      default: {
        format: '*HH*<blink>:</blink>mm',
      },
    }

    const variant = variants[config.variant ?? 'default']

    return (
      <DateTimeLabel
        format={variant.format}
        className={variant.className}
        style={variant.style}
      />
    )
  },
  type: 'time',
})
