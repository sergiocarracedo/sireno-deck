type Button = {
  type: string
  position: number
  config: Record<string, unknown>
}
type Deck = { name: string; buttons: Button[] }

export const safeEventUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

export const createCalendarDecks = (
  events: readonly { day: string }[],
  keyCount: number,
  calendars: readonly {
    instanceId: string
    id: string
    name: string
    enabled: boolean
  }[] = [],
): Record<string, Deck> => {
  const decks: Record<string, Deck> = {}
  const pageSize = Math.max(1, keyCount - 3)
  const paginate = (
    base: string,
    name: string,
    entries: Omit<Button, "position">[],
    switchTo?: string,
  ) => {
    const pages = Math.max(1, Math.ceil(entries.length / pageSize))
    const id = (page: number) => (page === 0 ? base : `${base}-p${page + 1}`)
    for (let page = 0; page < pages; page++) {
      const buttons: Button[] = entries
        .slice(page * pageSize, (page + 1) * pageSize)
        .map((entry, position) => ({ ...entry, position: position + 1 }))
      if (switchTo)
        buttons.push({
          type: "core:change-deck",
          position: 0,
          config: {
            deck: switchTo,
            label: switchTo === "calendar:days" ? "By day" : "All events",
            icon: "icon://calendar-days",
          },
        })
      if (pages > 1)
        buttons.push({
          type: "core:page-nav",
          position: keyCount - 2,
          config: {
            currentPage: page + 1,
            totalPages: pages,
            prevDeckId: id(Math.max(0, page - 1)),
            nextDeckId: id(Math.min(pages - 1, page + 1)),
          },
        })
      decks[id(page)] = { name, buttons }
    }
  }
  const entries = events.map((_, slot) => ({
    type: "calendar:event",
    config: { slot },
  }))
  paginate("calendar:deck", "Calendar", entries, "calendar:days")
  const days = [...new Set(events.map((event) => event.day))]
  paginate(
    "calendar:days",
    "Calendar days",
    days.map((day) => ({
      type: "calendar:day",
      config: { day, target: `calendar:day-${day}` },
    })),
  )
  for (const day of days)
    paginate(
      `calendar:day-${day}`,
      day,
      entries.filter((_, slot) => events[slot]?.day === day),
    )
  decks["calendar:detail"] = {
    name: "Event details",
    buttons: [{ type: "calendar:detail", position: 0, config: {} }],
  }
  const settingsPageSize = Math.max(1, keyCount - 2)
  const settingsPages = Math.max(
    1,
    Math.ceil(calendars.length / settingsPageSize),
  )
  const settingsId = (page: number) =>
    page === 0 ? "calendar:settings" : `calendar:settings-p${page + 1}`
  for (let page = 0; page < settingsPages; page++) {
    const buttons: Button[] = calendars
      .slice(page * settingsPageSize, (page + 1) * settingsPageSize)
      .map((calendar, position) => ({
        type: "calendar:setting",
        position,
        config: { instanceId: calendar.instanceId, calendarId: calendar.id },
      }))
    if (settingsPages > 1)
      buttons.push({
        type: "core:page-nav",
        position: keyCount - 2,
        config: {
          currentPage: page + 1,
          totalPages: settingsPages,
          prevDeckId: settingsId(Math.max(0, page - 1)),
          nextDeckId: settingsId(Math.min(settingsPages - 1, page + 1)),
        },
      })
    decks[settingsId(page)] = { name: "Calendar settings", buttons }
  }
  const columns =
    keyCount === 32
      ? 8
      : keyCount === 15
        ? 5
        : keyCount === 6
          ? 3
          : Math.max(3, Math.ceil(Math.sqrt(keyCount)))
  const rows = Math.ceil(keyCount / columns)
  const center =
    (rows >= 3 ? Math.floor((rows - 1) / 2) : 0) * columns +
    Math.floor(columns / 2)
  const buttons: Button[] = [
    { type: "calendar:alarm-dismiss", position: center - 1, config: {} },
    { type: "calendar:alarm-bell", position: center, config: {} },
    { type: "calendar:alarm-snooze", position: center + 1, config: {} },
  ]
  if (center + columns < keyCount - 1) {
    const titleCenter = center >= columns ? center - columns : center + columns
    const titlePositions =
      columns >= 5
        ? [titleCenter - 1, titleCenter, titleCenter + 1]
        : [titleCenter]
    titlePositions
      .filter((position) => position < keyCount - 1)
      .forEach((position, part) =>
        buttons.push({
          type: "calendar:alarm-title",
          position,
          config: { part, parts: titlePositions.length },
        }),
      )
  }
  if (center >= columns) {
    const timingCenter = center + columns
    buttons.push({
      type: "calendar:alarm-countdown",
      position: timingCenter - 1,
      config: {},
    })
    buttons.push({
      type: "calendar:alarm-clock",
      position: timingCenter + 1,
      config: {},
    })
    buttons.push({
      type: "calendar:alarm-arrow",
      position: timingCenter,
      config: {},
    })
  } else if (keyCount === 6) {
    buttons.push({
      type: "calendar:alarm-compact-info",
      position: 3,
      config: {},
    })
  }
  decks["calendar:alarm"] = { name: "Calendar alarm", buttons }
  return decks
}
