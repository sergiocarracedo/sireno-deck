import type { CalendarEvent } from "./events.js"

export type AlarmSettings =
  | { readonly enabled: false }
  | { readonly enabled: true; readonly offsetsMinutes: readonly number[] }

/** Calendar settings replace global settings; provider reminders are opt-in. */
export const resolveAlarmOffsets = (
  event: CalendarEvent,
  global: AlarmSettings,
  calendar?: AlarmSettings,
  useCalendarReminders = false,
): readonly number[] => {
  const settings = calendar ?? global
  if (!settings.enabled || event.status === "cancelled") return []
  const offsets = [
    ...settings.offsetsMinutes,
    ...(useCalendarReminders ? (event.notificationReminders ?? []) : []),
  ]
  return [...new Set(offsets)].sort((a, b) => a - b)
}
