import type { AddonManifestV1 } from "@/addon/api"
import type { RuntimeButton, RuntimeDeck } from "./runtime"

const settingsId = "internal-settings:settings"

export const buildAddonSettingsDecks = (
  decks: readonly RuntimeDeck[],
  addons: readonly Pick<AddonManifestV1, "name" | "settings">[],
  keyCount: number,
): RuntimeDeck[] => {
  const base = decks.find((deck) => deck.id === settingsId)
  if (!base) return [...decks]
  const compact = keyCount === 6
  const entries = addons.filter((addon) => addon.settings !== undefined)
  const start = compact ? 2 : 4
  const available = keyCount - 1 - start
  const paginated = entries.length > available
  const pageSize = available - (paginated ? 1 : 0)
  if (pageSize < 1) return [...decks]
  const total = Math.max(1, Math.ceil(entries.length / pageSize))
  const pageId = (page: number) =>
    page === 0 ? settingsId : `${settingsId}-p${page + 1}`
  const pages = Array.from({ length: total }, (_, page): RuntimeDeck => {
    const buttons: RuntimeButton[] = compact
      ? [
          {
            id: "app-info",
            type: "internal-settings:compact-app-info",
            position: 0,
            config: { icon: "addon://internal-settings/logo72x72.png" },
          },
          {
            id: "brightness",
            type: "internal-settings:compact-brightness",
            position: 1,
          },
        ]
      : [
          {
            id: "app-info",
            type: "internal-settings:app-info",
            position: 0,
            config: { icon: "addon://internal-settings/logo72x72.png" },
          },
          {
            id: "brightness-down",
            type: "internal-settings:brightness-down",
            position: 1,
          },
          {
            id: "brightness-up",
            type: "internal-settings:brightness-up",
            position: 2,
          },
        ]
    for (const [index, addon] of entries
      .slice(page * pageSize, (page + 1) * pageSize)
      .entries()) {
      const settings = addon.settings!
      buttons.push({
        id: `settings-${addon.name}`,
        type: "core:change-deck",
        position: start + index,
        config: {
          deck: settings.deck,
          label: settings.label,
          icon: settings.icon,
        },
      })
    }
    if (paginated)
      buttons.push({
        id: "page-nav",
        type: "core:page-nav",
        position: keyCount - 2,
        config: {
          currentPage: page + 1,
          totalPages: total,
          prevDeckId: pageId(Math.max(0, page - 1)),
          nextDeckId: pageId(Math.min(total - 1, page + 1)),
        },
      })
    return {
      ...base,
      id: pageId(page),
      buttons,
      sourceDeckId: settingsId,
      projectionId: pageId(page),
      pageIndex: page,
      paginated,
    }
  })
  return decks.flatMap((deck) => (deck.id === settingsId ? pages : [deck]))
}
