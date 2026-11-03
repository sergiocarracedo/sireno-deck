# Calendar addon design

## Goal and scope

Create a third-party Calendar addon with an upcoming-events button, a calendar deck, and persistent alarms. The first release supports Google Calendar, Microsoft 365/Outlook, and public or secret iCalendar URL feeds. Google is the primary target. Local ICS files and authenticated HTTP feeds are outside the initial scope.

## Providers and events

One addon contains provider adapters and a shared alarm engine. A provider type describes an integration; a provider instance is a configured account or feed. Multiple instances of any type are supported. Users explicitly select the calendars to include from Google and Microsoft; each iCalendar feed represents one calendar.

Adapters normalize events into a provider-independent model with stable provider-instance, calendar, event and recurring-occurrence identities; title; start and end; all-day status and timezone; cancellation status; available details and external link; and notification-style reminders. Email and other reminder actions do not become addon alarms. Document provider limitations.

Selected calendars are merged chronologically. Refreshes follow current event data: moved events reschedule future alarms, cancelled events remove alarms, and changed details update the display. Event lookahead is configurable and defaults to seven days. Scheduling must account for reminders due before an event enters the visible lookahead window.

Google and Microsoft authentication will support user-supplied OAuth app credentials initially, with a path to shared app credentials later. Treat tokens, credentials and secret feed URLs as secrets; never publish them to the frontend or include them in logs.

## Alarm configuration and behavior

Users can configure or disable global alarm defaults. Calendar-specific settings replace global settings and can also disable alarms. For an enabled calendar, notification-style event reminders take priority when present; otherwise use the applicable configured offsets. Support multiple offsets before, at, or after an event starts. For all-day events, addon-defined offsets use a configurable local reference time.

Each alarm is identified by provider instance, calendar, event occurrence and reminder. Queue active alarms one at a time. Tap snoozes the current alarm for a configurable duration; hold dismisses that alarm; double-tap dismisses all alarms for the event occurrence. Snoozing or dismissing reveals the next queued alarm; a snoozed alarm returns when due.

Persist dismissal and snooze state across restarts. Recover missed alarms within a configurable grace period, without replaying dismissed alarms or losing snoozes. Deck alerts repeat until snoozed or dismissed. System notifications are independently configurable and repeat when enabled. Define the repeat interval and visual treatment during implementation planning.

When an event is rescheduled, treat it as newly scheduled: clear previous snoozes and dismissals for that occurrence and schedule alarms against the new time.

By default an alarm interrupts the current deck; interruption can be disabled. Preserve and restore the previous context when appropriate. Verify whether the third-party addon API can safely present and restore an interrupting view, including interaction with existing overlays; identify the smallest host change if necessary.

## Button and deck

The upcoming-events button cycles through pages on tap, including upcoming events and a summary such as today's event count and the next event. Holding it opens the calendar deck. Alarm gestures take precedence while an alarm is active.

The deck supports configurable chronological and day-grouped views. The chronological view shows one event per button, paginated as needed; the grouped view lets users select a day and see its events. Tapping an event shows available details, including its time, calendar, location and meeting link. A separate gesture opens the event externally when a usable link exists; define the gesture alongside detail-view controls.

When interruption is disabled, make the active alarm accessible through the calendar button. Distinguish an empty calendar from stale or unavailable provider data.

## Reliability and verification

Isolate provider failures so one connection does not stop other instances or alarm processing. Preserve the last successfully fetched data, mark it stale and identify the connection needing attention. Authentication errors should prompt reauthorization. A failed refresh must not be treated as cancellation of all previously fetched events.

Test provider normalization with mocked Google and Microsoft responses and representative ICS feeds. Cover alarm precedence, overrides, disabling, queueing, repeat notifications, all gestures, persistence, grace periods, and restart recovery. Test moved and cancelled events, recurring occurrences, all-day events, timezones and daylight-saving transitions, duplicate reminder offsets, and reminders outside the visible lookahead. Test both deck views, pagination, empty and stale states, external-link availability, and interrupt/restore integration.

## Decisions to resolve during planning

- Verify host API support for interruption, restoration, addon-level configuration, durable state and system notifications.
- Define reconciliation of persisted snoozes and dismissals when reminders change without an event moving.
- Define repeat intervals, alert presentation, grace-period defaults and the external-open gesture.
- Verify provider-specific reminder, recurrence, OAuth and calendar-selection capabilities against current documentation.
- Define how scheduling discovers reminders due before events enter the configured lookahead, without assuming providers expose arbitrary reminder horizons.
