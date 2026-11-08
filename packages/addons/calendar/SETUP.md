# Google Calendar setup

Enable the Google Calendar API in Google Cloud and create an OAuth client of
type **Desktop app**. Configure the OAuth consent screen and add your Google
account as a test user while the app is in testing. Have the client ID and
client secret ready. The app requests read-only calendar access.

Build the setup module, then run it in an interactive terminal:

```sh
pnpm --filter @sirenodeck/addon-calendar build:setup
sirenodeck addon-setup packages/addons/calendar/dist/setup.js
```

Choose a unique account ID and select one or more calendars. Setup saves the
provider to the active config, or asks for a config path if no daemon is running.
You can add another account when prompted. If the config cannot be updated,
setup prints the provider and manual instructions. Restart Sireno Deck to apply
changes. Use the same account ID to reauthorize or change the calendar
selection. The client secret and refresh token are kept in the native
credential store, not the printed configuration. Setup requires that store to
be available; unlocking the desktop keyring may be necessary.

Setup saves the selected Google calendar colors in `calendarColors` so event
dates can use them. Re-run setup for an existing account to capture colors;
calendars without a saved color use the active theme's accent.

By default, the addon schedules alarms 5 minutes before and at the event start,
independently of Google reminders. Configure `alarms: { enabled: true,
offsetsMinutes: [-5, 0] }` under the addon's `config.service` to change the
offsets. Set `useCalendarReminders: true` there to also schedule the calendar's
popup reminders; duplicate offsets are only scheduled once. Calendar-specific
alarm settings replace the global custom offsets and can disable alarms.

The command above is for a source checkout; a distributed addon must include
the compiled `dist/setup.js` and its imported files, and users must pass the
path to that installed file instead.
