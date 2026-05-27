import { ButtonSurface, defineMountedButton } from '../../../addon/api.js'
import { Text } from '../../../ui/index.js'
import {
  ANALOG_CLOCK_INTERVAL_MS,
  BuiltinAnalogClockButtonSchema,
} from '../schemas.js'

function AnalogClockLabel(props: {
  className: string
  label: string
  tone: 'foreground' | 'primary'
  typography: 'aux' | 'main'
}) {
  return (
    <span className={`block ${props.className}`}>
      <Text className="w-full" fit="wrap" tone={props.tone} typography={props.typography}>
        {props.label}
      </Text>
    </span>
  )
}

export const builtinAnalogClockButton = defineMountedButton({
  configSchema: BuiltinAnalogClockButtonSchema,
  defaultIntervalMs: ANALOG_CLOCK_INTERVAL_MS,
  render: () => (
    <ButtonSurface full_surface>
      <div
        className="bg-background border-primary flex items-center justify-center w-full h-full"
        style={{
          border:
            '1px solid color-mix(in oklab, var(--sireno-color-primary) 58%, transparent)',
          borderRadius: '16px',
          padding: '10px',
        }}
      >
        <div className="flex flex-col items-center justify-center w-full" style={{ gap: '4px' }}>
          <AnalogClockLabel
            className="font-main text-primary"
            label="Clock"
            tone="primary"
            typography="main"
          />
          <AnalogClockLabel
            className="font-aux text-foreground"
            label="LIVE"
            tone="foreground"
            typography="aux"
          />
        </div>
      </div>
    </ButtonSurface>
  ),
  type: 'analog-clock',
})
