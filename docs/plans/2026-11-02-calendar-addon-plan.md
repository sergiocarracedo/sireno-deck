# Calendar addon implementation plan

**Design:** [Calendar addon design](2026-11-02-calendar-addon-design.md)

## Outcome

Ship a third-party Calendar addon with multiple Google Calendar, Microsoft 365/Outlook and iCalendar feed instances, a normalized event model, a multipage button, calendar decks and reliable configurable alarms.

## Existing constraints and first checkpoint

- `packages/cli/src/addon/api.ts` currently uses `globalService`, button `service`, array-form deck entries and an explicit gesture allowlist. Follow the code rather than older terminology in `ARCHITECTURE.md`.
- `AddonServiceContext` provides `notify` and optional `requestDeckRebuild`, but no store or navigation API. Button contexts have `store` and `coreMethods`.
- `bridgeAddonBackends` calls `globalService.onLoad(ctx)` without a config argument, despite the optional config parameter in the public type. Calendar configuration therefore needs a host delivery path, not just a type declaration.
- `packages/cli/src/config/schemas.ts` currently restricts addon `config` to deck defaults and overrides. `buildAddonConfigOverrides` in `packages/cli/src/cli/commands/run.ts` also passes other config keys to generated decks. Introduce a separate service-only configuration field and exclude it from deck materialization; do not place credentials in frontend-visible deck config. Trace editor and reload paths before finalizing this boundary.
- `packages/cli/src/core/store.ts` implements an in-memory store; do not assume it survives a restart. Trace any persistence wrapper before choosing a durable state mechanism.
- Third-party packaging and split browser/server bundles can be modeled on `packages/addons/pomodoro/`.
- Before implementation, inspect configuration hydration, dynamic deck lifecycle, existing overlays, storage and notification providers. Verify the smallest compatible host changes required for addon-global configuration, durable state and interrupt/restore. Record findings and test the host seam before building against it.

## Work units

### 1. Host capabilities and addon scaffold

- [ ] Trace how addon configuration reaches `globalService.onLoad`, how dynamically generated decks rebuild, and whether a global service runs without a mounted button. Identify any actual gaps rather than relying on type signatures alone.
- [ ] Design an owned, reversible alarm-interruption API that preserves navigation and existing overlay state, handles competing interruptions and disconnects, and does not overwrite newer user navigation. Add host changes only where necessary.
- [ ] Choose and implement durable addon-scoped state with atomic writes, appropriate permissions, validation and recovery from corrupt state. Keep credentials in a separate secret-storage path; verify platform support and document limitations.
- [ ] Create `packages/addons/calendar/` with discovery metadata, build configuration, separate Node/browser outputs, typed manifest, tests and minimal documentation. Follow existing workspace packaging and named-export conventions.
- [ ] Add host integration tests for global lifecycle, configuration, persistence and interruption/restoration, including shutdown and restart.

### 2. Configuration and normalized model

- [ ] Define strict Zod schemas for named provider instances, explicitly selected calendars, global and calendar alarm settings, snooze, lookahead, all-day reference time, interruption and system notifications. Calendar settings replace global settings; a disabled setting suppresses event reminders too.
- [ ] Define provider-neutral calendar and event types, including stable instance/calendar/event/occurrence identities, timed and all-day boundaries, timezone, status, details, external link and notification-style reminders. Model missing reminder data separately from an explicitly empty reminder list where providers distinguish them.
- [ ] Define stable reminder identities and reconciliation rules for moved events and changed reminders. A rescheduled occurrence clears previous snoozes and dismissals; determine behavior for reminder edits without a move. Test recurring occurrences independently.
- [ ] Test invalid configurations, repeated provider types, isolated instances, override/disable precedence and time calculations.

### 3. Authentication and provider adapters

- [ ] Consult current Google Calendar, Microsoft Graph and relevant iCalendar documentation before choosing APIs and dependencies. Record actual reminder, recurrence, cancellation, calendar-discovery and timezone limitations.
- [ ] Implement read-only Google and Microsoft sign-in using user-supplied OAuth app credentials, token refresh and reauthorization. Design a seam for future shared credentials; shared-app registration and approval are not required for the initial release.
- [ ] Implement Google and Microsoft calendar discovery and explicit selection; fetch and normalize events and supported notification reminders. Ensure recurring instances and cancelled or moved events retain appropriate identities.
- [ ] Implement public and secret URL iCalendar feeds, including recurrence, all-day events and supported notification-style `VALARM` entries. HTTP authentication and local files are out of scope.
- [ ] Isolate refresh failures, retain last successful data as stale, back off appropriately, and distinguish failed refreshes from genuine deletions. Do not emit tokens, credentials or secret URLs to logs or frontend channels.
- [ ] Test adapters with mocked HTTP and representative fixtures, malformed feeds, token expiry, partial failures, recurrence exceptions and cancellation. No live credentials in tests.

### 4. Alarm scheduling and persistence

- [ ] Build an independently testable clock-driven scheduler. Apply event notification reminders when present; otherwise apply the calendar override or global defaults. Support multiple negative, zero and positive offsets and deduplicate equivalent reminders.
- [ ] Establish a provider-aware fetch horizon that discovers alarms due before an event enters the visible seven-day default lookahead. Define safe limits and report provider limitations rather than silently missing reminders.
- [ ] Implement one-at-a-time queueing, configurable snooze, hold-to-dismiss-one and double-tap-to-dismiss-all for the occurrence. Persist state and recover snoozes and missed alarms within a configurable grace period.
- [ ] Repeat deck alerts until snoozed or dismissed; optionally repeat system notifications. Set explicit defaults for repetition and grace period before implementation and document them.
- [ ] Reconcile event moves, cancellations and reminder edits without duplicates or accidental replay. Test restarts, clock changes, stale provider data, multiple simultaneous events, long offsets and daylight-saving transitions using fake time.

### 5. Button, deck and presentation

- [ ] Implement an upcoming-events button whose tap cycles event and summary pages and whose hold opens the calendar deck. Alarm gestures take priority; ensure an active alarm remains reachable when interruption is disabled.
- [ ] Implement interrupting alarm presentation, enabled by default, with one active alarm shown at a time and correct restoration when the queue clears. Handle concurrent overlays and user navigation through the host seam from unit 1.
- [ ] Implement chronological and day-grouped calendar decks, event pagination and details. Add a separate external-open gesture when a provider link exists; decide and document the gesture before implementation.
- [ ] Provide loading, empty, stale, unavailable and reauthorization states. Publish only the minimum event data needed by the frontend, never credentials or secret feed URLs.
- [ ] Test button gestures, deck rebuilding, display modes, pagination, queue transitions, unavailable links and error states.

### 6. Integration, documentation and release readiness

- [ ] Document installation, OAuth application setup, feed URLs, provider instances, calendar selection, alarm inheritance and controls, persistence, platform requirements, privacy and provider limitations.
- [ ] Review and update relevant root skills and website registry metadata when addon manifests, authoring contracts or registry metadata change; update architecture documentation for any host API changes.
- [ ] Run addon tests and build, host integration tests, `pnpm lint`, `pnpm format`, `pnpm typecheck` and `pnpm test --run`. Verify format command effects before running it against existing work.
- [ ] Follow `AGENTS.md` emulator verification for both surfaces; additionally exercise an alarm interrupt, snooze, dismiss, event deck, and restart recovery. Stop only processes started for verification.

## Acceptance criteria

- Multiple configured accounts and feeds can coexist; only selected calendars contribute events.
- Event reminders take priority over inherited addon offsets; calendar overrides and disables work as specified.
- Alarm state survives restart, missed alarms respect the grace period, and gestures operate on the intended alarm or occurrence.
- Provider failures do not erase healthy data or prevent other instances from operating.
- Alarm interruption is enabled by default, configurable, and restores context without corrupting navigation or another overlay.
- Both calendar views, details and external opening work with available provider data; secrets never reach the frontend or logs.

## Decisions requiring confirmation

Before implementing their respective units, agree on defaults for snooze, repeat cadence, all-day reference time and missed-alarm grace period; the event external-open gesture; and the rules for snoozed or dismissed alarms when reminders change without the event moving. Confirm the chosen durable and secret storage mechanisms against supported platforms.
