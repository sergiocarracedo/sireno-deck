import { authorizeGoogle, SIRENO_GOOGLE_CLIENT_ID } from "./auth/google-auth.js"
import { createGoogleCalendarProvider } from "./providers/google/index.js"

export const addonName = "calendar"

interface SetupContext {
  credentials: Parameters<typeof authorizeGoogle>[0]["credentials"]
  openUrl(url: string): void | Promise<void>
  text(message: string, secret?: boolean): Promise<string>
  selectMany(
    message: string,
    options: readonly {
      value: string
      label: string
      hint?: string
      color?: string
    }[],
  ): Promise<string[]>
  confirm(message: string): Promise<boolean>
  saveProvider(provider: {
    id: string
    type: string
    clientId: string
    calendarIds: string[]
    calendarColors?: Record<string, string>
  }): Promise<string | null>
  print(message: string): void
}

/** Authorize one Google account and return its non-secret service configuration. */
export async function setupAddon(ctx: SetupContext): Promise<void> {
  ctx.print(
    "Sign in with Google to select the calendars to display on your deck.",
  )
  do {
    const id = (
      await ctx.text(
        "Account ID (letters, numbers, . _ -)\nName the account to identify it on Sireno Deck",
      )
    ).trim()
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(id))
      throw new Error("Invalid Google account ID")
    const accessToken = await authorizeGoogle({
      instanceId: id,
      clientId: SIRENO_GOOGLE_CLIENT_ID,
      credentials: ctx.credentials,
      openUrl: ctx.openUrl,
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
      "Select calendars (A: select/deselect all)",
      calendars.map((calendar) => ({
        value: calendar.id,
        label: calendar.name,
        hint: calendar.id,
        ...(calendar.color ? { color: calendar.color } : {}),
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
    const config = {
      id,
      type: "google",
      clientId: SIRENO_GOOGLE_CLIENT_ID,
      calendarIds: [...new Set(selected)],
      calendarColors: Object.fromEntries(
        calendars
          .filter(
            (calendar) =>
              selected.includes(calendar.id) &&
              /^#[0-9a-f]{6}$/i.test(calendar.color ?? ""),
          )
          .map((calendar) => [calendar.id, calendar.color!]),
      ),
    }
    const path = await ctx.saveProvider(config)
    if (path === null) {
      ctx.print(
        `Could not update a config file. Add this provider to the calendar addon's config.service.providers:\n${JSON.stringify(config, null, 2)}`,
      )
    } else {
      ctx.print(
        `Calendar account saved to ${path}. Restart Sireno Deck to apply it.`,
      )
    }
  } while (await ctx.confirm("Add another calendar account?"))
}
