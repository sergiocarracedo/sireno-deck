---
title: Calendar addon - Plan
type: feat
date: 2026-11-02
execution: code
---

# Calendar addon - Plan

**Design:** [Calendar addon design](2026-11-02-calendar-addon-design.md)

## Outcome

Ship a third-party Calendar addon with multiple Google Calendar, Microsoft 365/Outlook and iCalendar feed instances, a normalized event model, a multipage button, calendar decks and reliable configurable alarms.

## Existing constraints and first checkpoint

- `packages/cli/src/addon/api.ts` currently uses `globalService`, button `service`, array-form deck entries and an explicit gesture allowlist. Follow the code rather than older terminology in `ARCHITECTURE.md`.
- `AddonServiceContext` provides `notify`, optional `requestDeckRebuild`, scoped credentials, and an optional owned `interruptDeck` API. It does not expose persistent state. Button contexts have `store` and `coreMethods`.
- `addons[].config.service` reaches `globalService.onLoad` and is excluded from generated deck configuration. It is ordinary configuration, not a credential vault; verify editor and reload paths before claiming broader secrecy.
- `packages/cli/src/core/store.ts` implements an in-memory store; do not assume it survives a restart. Trace any persistence wrapper before choosing a durable state mechanism.
- Third-party packaging and split browser/server bundles can be modeled on `packages/addons/pomodoro/`.
- Before implementation, inspect configuration hydration, dynamic deck lifecycle, existing overlays, storage and notification providers. Verify the smallest compatible host changes required for addon-global configuration, durable state and interrupt/restore. Record findings and test the host seam before building against it.
- The checkpoint adds the credential adapter and Calendar domain, queue, and file-storage modules; none makes Calendar installable or wires persistence into a running service. Review those modules against this plan rather than treating their presence as completion.

## Decisions

- **Provider scope:** Google Calendar, Microsoft 365/Outlook and iCalendar feeds share one normalized addon model (session-settled: user-directed — chosen over Google-only: support common calendar accounts and feeds).
- **Alarm presentation:** interruption is configurable and enabled by default; active alarms queue one at a time (session-settled: user-directed — chosen over no interruption: alarms should be actionable on the deck).
- **Alarm controls:** the alarm modal's Dismiss button dismisses every reminder for that occurrence (a single-reminder dismiss leaves the next active reminder re-presenting the modal immediately), Snooze and OK snooze the active reminder; holds are not handled (session-settled: user-directed — dedicated buttons replaced the earlier one-button gesture scheme).
- **Timing defaults:** snooze 5 minutes, repeat every minute, recover alarms missed within one hour, and use 09:00 local time for all-day events; each is configurable (session-settled: user-approved — chosen over gentler timings: provide prompt reminders while permitting adjustment).
- **Reminder edits:** preserve snooze and dismissal state for unchanged offsets; remove deleted offsets and schedule new ones (session-settled: user-approved — chosen over resetting every alarm: avoid repeating already handled reminders).
- **Moved events:** clear previous alarm actions for the moved occurrence and schedule its new times (session-settled: user-directed — chosen over preserving earlier actions: treat the move as a new schedule).
- **Event links:** tap an event to open its usable provider link; events without a link open the detail deck. Holding the event-detail button also opens an available link.
- **Google onboarding:** use a shared Sireno Deck desktop OAuth client when available, with user-provided client credentials as a fallback (session-settled: user-approved — chosen over requiring every user to register a client: simplify sign-in while retaining a usable fallback).

## Provider constraints

- Google event instances use `recurringEventId` plus `originalStartTime` for stable occurrence identity even when moved. Expand with `singleEvents`; resolve `useDefault` from calendar defaults and distinguish it from explicit overrides. Only `popup` reminders become alarms. [Google recurring events](https://developers.google.com/workspace/calendar/api/guides/recurringevents), [reminders](https://developers.google.com/workspace/calendar/api/concepts/reminders).
- Microsoft Graph calendar views expand occurrences and exceptions. Normalize `isReminderOn` and `reminderMinutesBeforeStart`; use delegated read permissions and cover personal accounts and organizational accounts as supported. [Calendar view](https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview), [permissions](https://learn.microsoft.com/en-us/graph/permissions-reference#calendarsread).
- iCalendar recurrence expansion must account for exceptions and timezones, including `VTIMEZONE`. Test feeds with long-running recurrences and bound work without silently dropping requested events. [ical.js recurrence](https://github.com/kewisch/ical.js/wiki/Parsing-iCalendar).
- Normalize the applicable notification reminders, including provider defaults. When that set is empty or unavailable, use the applicable addon settings; a calendar-level disable suppresses both. Verify provider semantics and make unavailable reminder data visible rather than silently claiming it was fetched.
- Avoid rebuilding the full deck on unchanged polls. Verify packaged Node and browser bundles independently. See `docs/solutions/runtime-errors/heartbeat-deck-config-rebroadcast-freeze.md` and `docs/solutions/build/published-cli-chunks-omitted-from-package.md`.

## Integration decisions

- Reuse `interruptDeck` instead of adding a second interruption mechanism. The runtime rejects interruptions while locked or for missing decks, and a newer interruption or navigation invalidates the old release handle. The bridge releases addon-owned handles on shutdown. Test the calendar service against these actual semantics rather than assuming a release restores a superseded view.
- Store OAuth tokens, optional client secrets and secret feed URLs only through the addon's scoped credentials interface. `addons[].config.service` is not secret storage. A locked or unavailable credential backend must produce a visible connection error, never a plaintext fallback. Account setup needs an explicit local authorization and calendar-selection flow; tests use mocked providers and must not require real credentials.
- Use the existing versioned atomic alarm file implementation as the starting point, not proof of integrated persistence. Choose the file location through a host-provided addon-scoped data directory; never derive a writable path from untrusted provider identifiers. Persist serialized queue transitions before reporting them complete, flush pending writes on shutdown, and report corrupt or unwritable state without claiming alarms were saved. Validate filesystem and permission behavior on each supported platform.
- Refresh each provider independently using the existing `provider-cache.ts` model. Reconcile cancellations only for a successfully refreshed provider instance; a stale or unavailable instance must retain its previous event and alarm state. A complete successful page sequence is the transaction boundary for that instance. Persist the last successful normalized snapshot separately from credentials in the private addon data directory so a failed first refresh after restart can display stale events; minimize stored fields and test permissions, corruption, retention and account removal.
- Request Google recurring instances with `singleEvents=true`, consuming every page; preserve the recurring event's original start as occurrence identity. Microsoft `calendarView` returns occurrences and exceptions and requires following `@odata.nextLink`; request delegated `Calendars.Read`. See [Google pagination](https://developers.google.com/workspace/calendar/api/guides/pagination), [Google recurring events](https://developers.google.com/workspace/calendar/api/guides/recurringevents), and [Microsoft calendarView](https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview).
- Use `ical.js` recurrence and exception handling with feed-provided `VTIMEZONE`; ensure a bounded expansion never reports a partial result as a successful refresh. Its recurrence expansion begins at the series start, so old high-frequency series need explicit resource-limit failure and stale-data handling. See [ical.js recurrence](https://github.com/kewisch/ical.js/wiki/Parsing-iCalendar).
- Place the eventual calendar button at main-deck position `1` only after a working addon is installed. The existing button at that position is `coding-agents:summary`; preserve it elsewhere only if the user chooses a destination. Never insert invented accounts, credentials, or feed URLs into the personal config.

### OAuth and setup flow

Expose calendar account setup as an explicit CLI operation, separate from daemon startup. Use the shared Sireno Deck Google desktop client by default once registration and any required verification are complete. Until then, or when the user chooses a custom client, guide the user through enabling the Calendar API, configuring consent and test users, creating a desktop client and selecting its downloaded credentials file. A named provider instance signs in through the system browser and selects from a paginated list of calendars. Write only the instance ID, client ID and selected calendar IDs to ordinary service configuration; store refresh tokens and any user-supplied client secret in the scoped credential store. Offer a manual browser URL if opening the browser fails, without printing authorization codes or tokens. Do not distribute a placeholder shared client or claim verification has been completed. A native client secret distributed with an application is not confidential.

Use authorization code flow with S256 PKCE, fresh state and verifier per attempt, and a short-lived loopback listener bound only to a loopback interface. Validate state, reject duplicate callbacks, enforce a timeout, and close the listener on success, cancellation or error. Register the appropriate provider desktop redirect URI and request read-only calendar scopes and offline access. Google uses a desktop client and offline access; Microsoft uses a public client, delegated `Calendars.Read` and `offline_access`, with the `common` authority for supported personal and organizational accounts. Refresh tokens must be replaced when rotated, and invalid grants must surface reauthorization without clearing the last successful calendar snapshot. Do not treat a desktop client secret as confidential authentication. Sources: [Google native OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [Microsoft authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).

### Addon data directory contract

Add a host-owned addon-scoped persistent data-directory capability to `AddonServiceContext`, resolved once by the host using platform-appropriate per-user application-data conventions and the registered addon identity. It must not accept a caller-supplied namespace or provider-controlled path segment. Keep alarm state in a fixed `alarms-v1.json` filename there; do not store secrets or event descriptions in that file. Create private directories and files where the OS supports them, document platform limitations, and report failures instead of silently falling back to temporary or plaintext locations. The host must provide a test-injectable directory and isolate addon namespaces. The addon serializes state writes through the existing `alarm-storage.ts`; extend the scheduler with an awaitable drain or disposal operation and await it on shutdown. Test shutdown during an in-flight transition. Retain corrupt files for diagnosis; surface an explicit recovery error rather than silently deleting state.

### Reminder discovery horizon

Compute a separate scheduling window, not just the visible lookahead: extend its start before `now - missedGraceMinutes` by the largest supported after-start reminder offset, and extend its end to the later of the visible horizon and `now + maxSupportedAdvanceReminder`. Set the supported advance bound to 28 days, matching Google's documented maximum override, and include the largest configured advance offset when it is larger. Query Google and Microsoft for this window and fully expand iCalendar occurrences within it. A configured offset has no artificial cap. Provider-supplied reminders beyond the bound cannot be discovered reliably before their event enters the window; document and expose this limitation for Microsoft and iCalendar rather than claiming full coverage. Recompute on every refresh and after configuration changes. Test short events with alarms after their end, all-day reference times and events spanning window boundaries.

### File and test map

- Host data-directory capability: `packages/cli/src/addon/api.ts`, `packages/cli/src/deck/addon-handler-bridge.ts`, and platform directory resolution under `packages/cli/src/`; test namespace isolation, unavailable paths and shutdown in `packages/cli/src/deck/__tests__/addon-handler-bridge-external.test.ts` and a colocated directory-resolver test.
- OAuth and setup: add `packages/addons/calendar/src/auth/` and a host-supported CLI setup entry; test state mismatch, timeout, denial, refresh rotation, locked credentials and calendar-selection pagination in `packages/addons/calendar/src/auth/__tests__/` and CLI integration tests. A CLI integration test must exercise the real setup entry, not just the OAuth helper.
- Provider and scheduling: extend `packages/addons/calendar/src/providers/{google,microsoft,ical}/` and `packages/addons/calendar/src/domain/`; use their colocated `__tests__/` for multi-page results, recurrence exceptions, timezone boundaries, 28-day reminders, longer configured offsets, and partial failures. Test a stale provider alongside a successful provider in the service integration test.
- Addon service and presentation: add the manifest, service, browser entry and calendar decks under `packages/addons/calendar/src/`; test button gestures, interruption supersession, queue persistence/restart, event details and safe external URLs in colocated `__tests__/`. Build both outputs and smoke-test discovery from a fresh addon installation.
- Personal configuration: after the addon works, point `~/.config/sirenodeck/config.yml` at the installed addon and replace only main position `1`; obtain account authorization locally. Keep unrelated entries unchanged and validate the resulting config before restarting any running service.

## Work units

### 1. Host capabilities and addon scaffold

- [ ] Trace how addon configuration reaches `globalService.onLoad`, how dynamically generated decks rebuild, and whether a global service runs without a mounted button. Identify any actual gaps rather than relying on type signatures alone.
- [ ] Use the existing `AddonServiceContext.interruptDeck` release handle for alarm interruption. Verify its behavior for overlays, competing interruptions, lock state, shutdown, and newer user navigation; add host changes only for demonstrated gaps. See `packages/cli/src/deck/runtime/runtime.ts`, `packages/cli/src/deck/addon-handler-bridge.ts`, and their interruption tests.
- [ ] Choose and implement durable addon-scoped state with atomic writes, appropriate permissions, validation and recovery from corrupt state. Keep credentials in a separate secret-storage path; verify platform support and document limitations.
- [ ] Create `packages/addons/calendar/` with discovery metadata, build configuration, separate Node/browser outputs, typed manifest, tests and minimal documentation. Follow existing workspace packaging and named-export conventions.
- [ ] Add host integration tests for global lifecycle, configuration, persistence and interruption/restoration, including shutdown and restart.

### 2. Configuration and normalized model

- [ ] Define strict Zod schemas for named provider instances, explicitly selected calendars, global and calendar alarm settings, snooze, lookahead, all-day reference time, interruption and system notifications. Calendar settings replace global settings; a disabled setting suppresses event reminders too.
- [ ] Define provider-neutral calendar and event types, including stable instance/calendar/event/occurrence identities, timed and all-day boundaries, timezone, status, details, external link and notification-style reminders. Model unavailable reminder data distinctly so the fallback is visible.
- [ ] Define stable reminder identities and apply the moved-event and reminder-edit decisions above. Test recurring occurrences independently.
- [ ] Test invalid configurations, repeated provider types, isolated instances, override/disable precedence and time calculations.

### 3. Authentication and provider adapters

- [ ] Consult current Google Calendar, Microsoft Graph and relevant iCalendar documentation before choosing APIs and dependencies. Record actual reminder, recurrence, cancellation, calendar-discovery and timezone limitations.
- [ ] Implement read-only Google and Microsoft sign-in, token refresh and reauthorization. Google onboarding uses the shared client when it is available and supports user-provided desktop credentials; the custom-client path remains functional if shared-app registration or verification is not yet complete. Microsoft initially uses user-supplied OAuth app credentials.
- [ ] Implement Google and Microsoft calendar discovery and explicit selection; fetch and normalize events and supported notification reminders. Ensure recurring instances and cancelled or moved events retain appropriate identities.
- [ ] Implement public and secret URL iCalendar feeds, including recurrence, all-day events and supported notification-style `VALARM` entries. HTTP authentication and local files are out of scope.
- [ ] Isolate refresh failures, retain last successful data as stale, back off appropriately, and distinguish failed refreshes from genuine deletions. Do not emit tokens, credentials or secret URLs to logs or frontend channels.
- [ ] Test adapters with mocked HTTP and representative fixtures, malformed feeds, token expiry, partial failures, recurrence exceptions and cancellation. No live credentials in tests.

### 4. Alarm scheduling and persistence

- [ ] Build an independently testable clock-driven scheduler. Apply event notification reminders when present; otherwise apply the calendar override or global defaults. Support multiple negative, zero and positive offsets and deduplicate equivalent reminders.
- [ ] Establish a provider-aware fetch horizon that discovers alarms due before an event enters the visible seven-day default lookahead. Define safe limits and report provider limitations rather than silently missing reminders.
- [ ] Implement one-at-a-time queueing, configurable snooze, hold-to-dismiss-one and double-tap-to-dismiss-all for the occurrence. Persist state and recover snoozes and missed alarms within a configurable grace period.
- [ ] Repeat deck alerts until snoozed or dismissed; when system notifications are enabled, repeat them on the same cadence. Apply and document the agreed timing defaults above. Test and document unavailable notification support.
- [ ] Correct the Windows notification provider's handling of provider-controlled titles and bodies before displaying calendar text. Test PowerShell metacharacters and ensure event text cannot become executable script.
- [ ] Reconcile event moves, cancellations and reminder edits without duplicates or accidental replay. Test restarts, clock changes, stale provider data, multiple simultaneous events, long offsets and daylight-saving transitions using fake time.

### 5. Button, deck and presentation

- [ ] Implement an upcoming-events button whose tap cycles event and summary pages and whose hold opens the calendar deck. Alarm gestures take priority; ensure an active alarm remains reachable when interruption is disabled.
- [ ] Implement interrupting alarm presentation, enabled by default, with one active alarm shown at a time and correct restoration when the queue clears. Handle concurrent overlays and user navigation through the host seam from unit 1.
- [ ] Implement chronological and day-grouped calendar decks, event pagination and details. Holding an event-detail button opens its usable provider link. Parse and restrict links to HTTP(S), and use the host's non-shell URL-opening boundary.
- [ ] Provide loading, empty, stale, unavailable and reauthorization states; identify the affected provider instance by its configured name. Publish only the minimum event data needed by the frontend, never credentials or secret feed URLs.
- [ ] Test button gestures, deck rebuilding, display modes, pagination, queue transitions, rejected link schemes and metacharacters, unavailable links and failure identification with multiple provider instances.

### 6. Integration, documentation and release readiness

- [ ] Document installation, shared-client availability, Google Cloud client creation, consent/test-user setup, Google verification and testing-mode token expiry, Microsoft OAuth setup, feed URLs, provider instances, calendar selection, alarm inheritance and controls, persistence, platform requirements, privacy and provider limitations.
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

## Implementation-time validation

Validate durable and secret storage against supported platforms, including the already-added native credential adapter. The existing atomic state file and in-memory host store are not evidence of end-to-end restart persistence. Prevent a partial provider failure from deleting another provider's alarms, and verify whether event and calendar identifiers contain sensitive data before writing state or logs.
