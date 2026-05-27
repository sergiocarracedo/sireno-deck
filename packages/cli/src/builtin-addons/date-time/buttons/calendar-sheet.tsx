import { ButtonSurface, defineMountedButton } from '../../../addon/api.js'
import { Text } from '../../../ui/index.js'
import {
  BuiltinCalendarSheetButtonSchema,
  CALENDAR_SHEET_INTERVAL_MS,
} from '../schemas.js'

function CalendarSheetLabel(props: {
  className: string
  label: string
  tone: 'accent' | 'foreground'
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

export const builtinCalendarSheetButton = defineMountedButton({
  configSchema: BuiltinCalendarSheetButtonSchema,
  defaultIntervalMs: CALENDAR_SHEET_INTERVAL_MS,
  render: () => (
    <ButtonSurface full_surface>
      <div
        className="bg-background border-accent flex items-center justify-center w-full h-full"
        style={{
          border:
            '1px solid color-mix(in oklab, var(--sireno-color-accent) 54%, transparent)',
          borderRadius: '16px',
          padding: '10px',
        }}
      >
        <div className="flex flex-col items-center justify-center w-full" style={{ gap: '4px' }}>
          <CalendarSheetLabel
            className="font-main text-foreground"
            label="Date"
            tone="foreground"
            typography="main"
          />
          <CalendarSheetLabel
            className="font-aux text-accent"
            label="SHEET"
            tone="accent"
            typography="aux"
          />
        </div>
      </div>
    </ButtonSurface>
  ),
  type: 'calendar-sheet',
})
