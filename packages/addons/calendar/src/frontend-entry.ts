import {
  CalendarButton,
  CalendarEventButton,
  CalendarDetailButton,
  CalendarNavigationButton,
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
  },
}
