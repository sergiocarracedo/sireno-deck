import { ButtonSurface, defineMountedButton } from '../../../addon/api.js'
import { Text } from '../../../ui/index.js'
import {
  BuiltinCalendarSheetButtonSchema,
  CALENDAR_SHEET_INTERVAL_MS,
} from '../schemas.js'

function CalendarSheetLabel(props: {
  label: string
  tone: 'accent' | 'foreground'
  typography: 'aux' | 'main'
}) {
  return (
    <Text
      className="w-full"
      fit="wrap"
      tone={props.tone}
      typography={props.typography}
      size="xs"
    >
      {props.label}
    </Text>
  )
}

export const builtinCalendarSheetButton = defineMountedButton({
  configSchema: BuiltinCalendarSheetButtonSchema,
  defaultIntervalMs: CALENDAR_SHEET_INTERVAL_MS,
  render: () => (
    <ButtonSurface full>
      <div className="flex w-full flex-col items-center justify-center gap-1">
        <CalendarSheetLabel label="Date" tone="foreground" typography="main" />
        <CalendarSheetLabel label="SHEET" tone="accent" typography="aux" />
      </div>
    </ButtonSurface>
  ),
  type: 'calendar-sheet',
})
