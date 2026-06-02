import { ButtonSurface, defineMountedButton } from '../../../addon/api.js'
import { Text } from '../../../ui/index.js'
import {
  ANALOG_CLOCK_INTERVAL_MS,
  BuiltinAnalogClockButtonSchema,
} from '../schemas.js'

function AnalogClockLabel(props: {
  label: string
  tone: 'foreground' | 'primary'
  typography: 'aux' | 'main'
}) {
  return (
    <Text
      className="w-full"
      fit="wrap"
      tone={props.tone}
      typography={props.typography}
    >
      {props.label}
    </Text>
  )
}

export const builtinAnalogClockButton = defineMountedButton({
  configSchema: BuiltinAnalogClockButtonSchema,
  defaultIntervalMs: ANALOG_CLOCK_INTERVAL_MS,
  render: () => (
    <ButtonSurface full_surface>
      <div
        className="bg-background flex h-full w-full items-center justify-center rounded-[16px] border p-2.5"
        style={{
          borderColor:
            'color-mix(in oklab, var(--sireno-color-primary) 58%, transparent)',
        }}
      >
        <div className="flex w-full flex-col items-center justify-center gap-1">
          <AnalogClockLabel label="Clock" tone="primary" typography="main" />
          <AnalogClockLabel label="LIVE" tone="foreground" typography="aux" />
        </div>
      </div>
    </ButtonSurface>
  ),
  type: 'clock',
})
