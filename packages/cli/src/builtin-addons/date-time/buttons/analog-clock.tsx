import {
  ButtonSurface,
  defineMountedButton,
  useButtonActionCommand,
} from '../../../addon/api.js'
import {
  ANALOG_CLOCK_INTERVAL_MS,
  BuiltinAnalogClockButtonSchema,
} from '../schemas.js'

function getAnalogClockAngles(date = new Date()) {
  const hours = date.getHours() % 12
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()

  return {
    hour: hours * 30 + minutes * 0.5 + seconds / 120,
    minute: minutes * 6 + seconds * 0.1,
  }
}

function AnalogClockFace() {
  const { hour, minute } = getAnalogClockAngles()

  return (
    <ButtonSurface>
      <svg
        aria-label="Analog clock"
        className="w-full h-full"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          fill="none"
          r="41"
          stroke="color-mix(in srgb, var(--sireno-color-foreground) 24%, transparent)"
          strokeWidth="2"
        />
        <g
          data-sireno-clock-minute-hand="true"
          style={{
            transform: `rotate(${minute}deg)`,
            transformOrigin: '50% 50%',
          }}
        >
          <line
            stroke="color-mix(in srgb, white 88%, var(--sireno-color-foreground) 12%)"
            strokeLinecap="round"
            strokeWidth="3.4"
            x1="50"
            x2="50"
            y1="50"
            y2="79"
          />
        </g>
        <g
          data-sireno-clock-hour-hand="true"
          style={{
            transform: `rotate(${hour}deg)`,
            transformOrigin: '50% 50%',
          }}
        >
          <line
            stroke="var(--sireno-color-primary)"
            strokeLinecap="round"
            strokeWidth="3"
            x1="50"
            x2="50"
            y1="50"
            y2="29"
          />
        </g>
        <circle
          cx="50"
          cy="50"
          fill="color-mix(in srgb, white 92%, var(--sireno-color-foreground) 8%)"
          r="3.6"
        />
      </svg>
    </ButtonSurface>
  )
}

function createAnalogClockButton(type: 'analog-clock' | 'clock') {
  return defineMountedButton({
    configSchema: BuiltinAnalogClockButtonSchema,
    defaultIntervalMs: ANALOG_CLOCK_INTERVAL_MS,
    ...useButtonActionCommand(({ config }) => config.commands),
    render: () => <AnalogClockFace />,
    type,
  })
}

export const builtinAnalogClockButton = createAnalogClockButton('analog-clock')

export const builtinClockButton = createAnalogClockButton('clock')
