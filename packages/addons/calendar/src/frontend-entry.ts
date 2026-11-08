import {
  CalendarButton,
  CalendarEventButton,
  CalendarDetailButton,
  CalendarNavigationButton,
  CalendarAlarmBell,
  CalendarAlarmCountdown,
  CalendarAlarmClock,
  CalendarAlarmTitle,
  CalendarAlarmDismiss,
  CalendarAlarmSnooze,
  CalendarAlarmArrow,
  CalendarAlarmCompactInfo,
} from "./frontend.js"

export const manifest = {
  apiVersion: 1,
  name: "calendar",
  buttonTypes: {
    "calendar:upcoming": { frontend: CalendarButton, service: {} },
    "calendar:event": { frontend: CalendarEventButton, service: {} },
    "calendar:detail": { frontend: CalendarDetailButton, service: {} },
    "calendar:navigate": { frontend: CalendarNavigationButton, service: {} },
    "calendar:day": { frontend: CalendarNavigationButton, service: {} },
    "calendar:alarm-bell": { frontend: CalendarAlarmBell, service: {} },
    "calendar:alarm-countdown": {
      frontend: CalendarAlarmCountdown,
      service: {},
    },
    "calendar:alarm-clock": { frontend: CalendarAlarmClock, service: {} },
    "calendar:alarm-title": { frontend: CalendarAlarmTitle, service: {} },
    "calendar:alarm-dismiss": { frontend: CalendarAlarmDismiss, service: {} },
    "calendar:alarm-snooze": { frontend: CalendarAlarmSnooze, service: {} },
    "calendar:alarm-arrow": { frontend: CalendarAlarmArrow, service: {} },
    "calendar:alarm-compact-info": {
      frontend: CalendarAlarmCompactInfo,
      service: {},
    },
  },
}
