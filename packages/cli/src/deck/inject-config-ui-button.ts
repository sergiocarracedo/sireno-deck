import type { RuntimeDeck } from "./runtime"

export const injectConfigUiButton = (
  decks: ReadonlyArray<RuntimeDeck>,
  configUiUrl: string,
): RuntimeDeck[] =>
  decks.map((deck) =>
    deck.id !== "internal-settings:settings"
      ? deck
      : {
          ...deck,
          buttons: [
            ...deck.buttons,
            {
              id: "config-ui",
              type: "core:action",
              position: 3,
              config: { label: "Config UI", icon: "icon://settings" },
              actions: { tap: `url://${configUiUrl}` },
            },
          ],
        },
  )
