import { authorizeGoogle, SIRENO_GOOGLE_CLIENT_ID } from "./auth/google-auth.js"
import { createGoogleCalendarProvider } from "./providers/google/index.js"
import { removeAccountLocalData } from "./domain/account-data.js"

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
  selectOne(
    message: string,
    options: readonly { value: string; label: string; hint?: string }[],
  ): Promise<string>
  confirm(message: string): Promise<boolean>
  saveProvider(provider: {
    id: string
    type: string
    clientId: string
    calendarIds: string[]
    calendarColors?: Record<string, string>
  }): Promise<string | null>
  listProviders(): Promise<string[]>
  removeProvider(id: string): Promise<string | null>
  getDataDirectory(): Promise<string>
  print(message: string): void
}

const DISCLOSURE =
  "Google Calendar access: Sireno Deck requests read-only access to calendars available to your Google account, including calendars you do not select for display. It reads calendar and event details to display events and provide reminders. Event details are held in memory; calendar selections and reminder metadata are stored locally. Authorized remote deck clients can receive displayed data. Google receives authorization and API requests. See https://deck.sireno.dev/privacy/ for details."

/** Remove every local trace of one account: token, reminders and calendar toggles. */
const forgetAccount = async (ctx: SetupContext, id: string): Promise<void> => {
  await ctx.credentials.delete(`google.${id}.refresh-token`)
  await ctx.credentials.delete(`google.${id}.client-secret`)
  await removeAccountLocalData(
    await ctx.getDataDirectory(),
    id,
    ctx.credentials,
  )
}

const removeAccount = async (ctx: SetupContext): Promise<void> => {
  const configured = await ctx.listProviders()
  if (!configured.length) {
    ctx.print("No Google accounts are configured for the calendar addon.")
    return
  }
  const id = await ctx.selectOne(
    "Select the account to disconnect",
    configured.map((account) => ({
      value: account,
      label: account,
      hint: "removes the account, its reminders and its stored access",
    })),
  )
  if (
    !(await ctx.confirm(
      `Disconnect "${id}"? This removes the account, its local reminders and its stored Google access.`,
    ))
  )
    return
  await forgetAccount(ctx, id)
  const path = await ctx.removeProvider(id)
  if (path === null) {
    ctx.print(
      `Removed the local data for "${id}", but the config file could not be updated. Remove the provider with id "${id}" from the calendar addon's config.service.providers by hand.`,
    )
  } else {
    ctx.print(`Removed "${id}" from ${path}. Restart Sireno Deck to apply it.`)
  }
  ctx.print(
    "Google still holds the grant you approved. To withdraw it, open https://myaccount.google.com/permissions and remove Sireno Deck's Calendar access. Removing that grant also affects Sireno Deck's other Google permissions for your account.",
  )
}

const addAccount = async (ctx: SetupContext): Promise<void> => {
  ctx.print(DISCLOSURE)
  if (!(await ctx.confirm("Continue to Google sign-in?"))) return
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
}

/** Authorize one Google account or disconnect an existing one. */
export async function setupAddon(ctx: SetupContext): Promise<void> {
  const configured = await ctx.listProviders()
  const action = await ctx.selectOne("What do you want to do?", [
    { value: "add", label: "Sign in to a Google account" },
    ...(configured.length
      ? [{ value: "remove", label: "Disconnect a Google account" }]
      : []),
  ])
  if (action === "remove") {
    await removeAccount(ctx)
    return
  }
  do {
    await addAccount(ctx)
  } while (await ctx.confirm("Add another calendar account?"))
}
