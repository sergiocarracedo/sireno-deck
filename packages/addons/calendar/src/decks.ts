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
        .map((entry, position) => ({ ...entry, position }))
      if (switchTo)
        buttons.push({
          type: "calendar:navigate",
          position: keyCount - 3,
          config: {
            target: switchTo,
            label: switchTo === "calendar:days" ? "By day" : "All events",
          },
        })
      if (pages > 1)
        buttons.push({
          type: "calendar:navigate",
          position: keyCount - 2,
          config: {
            target: id((page + 1) % pages),
            label: `Next ${page + 1}/${pages}`,
          },
        })
      decks[id(page)] = { name, buttons }
    }
  }
  const entries = events.map((_, slot) => ({
    type: "calendar:event",
    config: { slot },
  }))
  paginate("calendar:events", "Calendar", entries, "calendar:days")
  const days = [...new Set(events.map((event) => event.day))]
  paginate(
    "calendar:days",
    "Calendar days",
    days.map((day) => ({
      type: "calendar:day",
      config: { day, target: `calendar:day-${day}` },
    })),
    "calendar:events",
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
  return decks
}
