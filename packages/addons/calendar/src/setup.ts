import { authorizeGoogle } from "./auth/google-auth.js"
import { createGoogleCalendarProvider } from "./providers/google/index.js"

export const addonName = "calendar"

interface SetupContext {
  credentials: Parameters<typeof authorizeGoogle>[0]["credentials"]
  openUrl(url: string): void | Promise<void>
  text(message: string, secret?: boolean): Promise<string>
  selectMany(
    message: string,
    options: readonly { value: string; label: string }[],
  ): Promise<string[]>
  print(message: string): void
}

/** Authorize one Google account and return its non-secret service configuration. */
export async function setupAddon(ctx: SetupContext): Promise<void> {
  ctx.print(
    "Create a Google Cloud OAuth desktop client, enable the Google Calendar API, and add your Google account as a test user if required.",
  )
  const id = (
    await ctx.text("Account instance ID (letters, numbers, . _ -)")
  ).trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(id))
    throw new Error("Invalid Google instance ID")
  const clientId = (await ctx.text("Google OAuth client ID")).trim()
  if (!clientId) throw new Error("Google OAuth client ID is required")
  const clientSecret = (
    await ctx.text("Google OAuth client secret (leave blank if none)", true)
  ).trim()
  const accessToken = await authorizeGoogle({
    instanceId: id,
    clientId,
    credentials: ctx.credentials,
    openUrl: ctx.openUrl,
    ...(clientSecret ? { clientSecret } : {}),
  })
  const provider = createGoogleCalendarProvider({
    instanceId: id,
    calendarIds: [],
    timeMin: new Date().toISOString(),
    timeMax: new Date().toISOString(),
    accessToken,
  })
  const calendars = await provider.listCalendars()
  if (!calendars.length)
    throw new Error("No Google calendars found for this account")
  const selected = await ctx.selectMany(
    "Select calendars",
    calendars.map((calendar) => ({
      value: calendar.id,
      label: `${calendar.name} (${calendar.id})`,
    })),
  )
  if (
    !selected.length ||
    selected.some(
      (value) => !calendars.some((calendar) => calendar.id === value),
    )
  ) {
    throw new Error("Select at least one listed calendar")
  }
  ctx.print(
    `Add this provider to addons[].config.service.providers for the calendar addon (JSON is valid YAML):\n${JSON.stringify({ id, type: "google", clientId, calendarIds: [...new Set(selected)] }, null, 2)}\nRestart Sireno Deck after updating the config.`,
  )
}
