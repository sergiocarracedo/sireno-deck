import type { RuntimeDeck } from "./runtime"

export const injectConfigUiButton = (
  decks: ReadonlyArray<RuntimeDeck>,
  configUiUrl: string,
  keyCount = 15,
): RuntimeDeck[] =>
  decks.map((deck) =>
    deck.id !== "internal-settings:settings" &&
    !deck.id.startsWith("internal-settings:settings-p")
      ? deck
      : keyCount === 6
        ? {
            ...deck,
            buttons: deck.buttons.map((button) =>
              button.type === "internal-settings:compact-app-info"
                ? { ...button, actions: { tap: `url://${configUiUrl}` } }
                : button,
            ),
          }
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
