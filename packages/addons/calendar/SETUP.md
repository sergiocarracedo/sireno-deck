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

Choose a unique account instance ID and select one or more calendars. Add the
printed provider object to the calendar addon's `config.service.providers` list
in your existing config; do not replace other providers. Restart Sireno Deck to
apply it. Repeat setup with the same instance ID to reauthorize or change the
calendar selection. The client secret and refresh token are kept in the native
credential store, not the printed configuration. Setup requires that store to
be available; unlocking the desktop keyring may be necessary.

The command above is for a source checkout; a distributed addon must include
the compiled `dist/setup.js` and its imported files, and users must pass the
path to that installed file instead.
