import type { RuntimeDeck } from "./system-back-injection"

export const positionSettingsVersionButton = (
  decks: ReadonlyArray<RuntimeDeck>,
  keyCount: number,
): RuntimeDeck[] => {
  const versionPosition = keyCount - 2
  return decks.map((deck) =>
    deck.id !== "internal-settings:settings"
      ? deck
      : {
          ...deck,
          buttons: deck.buttons.map((button) =>
            button.type === "internal-settings:app-info"
              ? { ...button, position: versionPosition }
              : button,
          ),
        },
  )
}
