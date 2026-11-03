import type { CalendarEvent } from "./events.js"

export type AlarmSettings =
  | { readonly enabled: false }
  | { readonly enabled: true; readonly offsetsMinutes: readonly number[] }

/** Calendar settings replace global settings; event notification reminders win when present. */
export const resolveAlarmOffsets = (
  event: CalendarEvent,
  global: AlarmSettings,
  calendar?: AlarmSettings,
): readonly number[] => {
  const settings = calendar ?? global
  if (!settings.enabled || event.status === "cancelled") return []
  const reminders = event.notificationReminders
  const offsets =
    reminders !== undefined && reminders.length > 0
      ? reminders
      : settings.offsetsMinutes
  return [...new Set(offsets)].sort((a, b) => a - b)
}
