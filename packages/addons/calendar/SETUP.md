# Google Calendar setup

Sireno Deck uses its own Google OAuth desktop client and requests read-only
calendar access. Google may show an unverified-app warning until verification
is complete; while the app is in testing, your account must be a test user.

For local development, `build` and `build:setup` accept the build credential
from `SIRENO_GOOGLE_CLIENT_SECRET` or `GCANEDAR_APP_SECRET` in this addon's
gitignored `.env`. Release builds can provide `SIRENO_GOOGLE_CLIENT_SECRET`
through the build environment. The credential is embedded in the built addon
and is therefore extractable; never commit the `.env` file or build artifacts.

Run setup in an interactive terminal after installing and configuring the addon:

```sh
sirenodeck addon setup @sirenodeck/addon-calendar
```

`sirenodeck onboard` also offers setup for configured, installed addons. The
install command starts setup automatically in an interactive terminal.

Choose a unique account ID and select one or more calendars. Setup saves the
provider to the active config, or asks for a config path if no daemon is running.
You can add another account when prompted. If the config cannot be updated,
setup prints the provider and manual instructions. Restart Sireno Deck to apply
changes. Use the same account ID to reauthorize or change the calendar
selection. The refresh token is kept in the native credential store, not the
printed configuration. Setup requires that store to
be available; unlocking the desktop keyring may be necessary.

Event details are kept in memory, not saved for offline restart. If a refresh
fails while the addon is running, the last successful events can remain visible
until a later refresh or restart. After a restart, events and their titles are
unavailable until a refresh succeeds. Alarm metadata and calendar selections
remain stored locally; a recovered reminder may show a generic title until its
event has been fetched again. On startup, the addon removes its older unencrypted
`provider-snapshots-v1.json` event cache, if present. Copies in backups or other
locations are not removed automatically.

Setup saves the selected Google calendar colors in `calendarColors` so event
dates can use them. Re-run setup for an existing account to capture colors;
calendars without a saved color use the active theme's accent.

By default, the addon schedules alarms 5 minutes before and at the event start,
independently of Google reminders. Configure `alarms: { enabled: true,
offsetsMinutes: [-5, 0] }` under the addon's `config.service` to change the
offsets. Set `useCalendarReminders: true` there to also schedule the calendar's
popup reminders; duplicate offsets are only scheduled once. Calendar-specific
alarm settings replace the global custom offsets and can disable alarms.
Alerts are dismissed 10 minutes after the event starts, including snoozed and
queued reminders. Set `autoDismissMinutes` under `config.service` to change
this deadline; reminders scheduled at or after it will not be displayed.

For a source checkout, build the setup module first with
`pnpm --filter @sirenodeck/addon-calendar build:setup`. The explicit setup
module path remains supported for development.
