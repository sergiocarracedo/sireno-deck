/** @vitest-environment node */
import { describe, expect, it } from "vitest"

import { describeEditorSurfaces } from "../editor-surfaces"
import type { RuntimeDeck } from "../runtime"

const target = (index: number) => ({
  sourcePath: "/config.yml",
  sourceDeckId: "main",
  sourceButtonIndex: index,
  sourceButtonPath: `decks.main.buttons[${index}]`,
  fingerprint: `button-${index}`,
  capability: "update" as const,
})

describe("describeEditorSurfaces", () => {
  it("keeps configured source targets and derives pagination/system slots", () => {
    const deck: RuntimeDeck = {
      id: "main-p2",
      name: "Main",
      sourceDeckId: "main",
      projectionId: "main-p2",
      pageIndex: 1,
      paginated: true,
      editable: true,
      buttons: [
        { id: "b", type: "core:action", position: 0, sourceTarget: target(13) },
        { id: "nav", type: "core:page-nav", position: 13 },
        { id: "settings", type: "core:settings-entry", position: 14 },
      ],
      isMain: true,
    }

    expect(
      describeEditorSurfaces({
        decks: [deck],
        keyCount: 15,
        revision: 4,
      })[0],
    ).toEqual({
      id: "main-p2",
      sourceDeckId: "main",
      projectionId: "main-p2",
      pageIndex: 1,
      isOverlay: false,
      editable: true,
      addonOwner: null,
      reservedPositions: [13, 14],
      buttons: [
        { id: "b", type: "core:action", position: 0, sourceTarget: target(13) },
        { id: "nav", type: "core:page-nav", position: 13, sourceTarget: null },
        {
          id: "settings",
          type: "core:settings-entry",
          position: 14,
          sourceTarget: null,
        },
      ],
    })
  })

  it("does not invent targets for generated overlays or system buttons", () => {
    const deck: RuntimeDeck = {
      id: "addon:deck-p1",
      name: "Generated",
      sourceDeckId: "addon:deck",
      projectionId: "addon:deck-p1",
      pageIndex: 0,
      isOverlay: true,
      editable: false,
      addonOwner: {
        addonIndex: 2,
        addonName: "addon",
        overrideKey: "addon:deck",
        capabilities: ["set-addon-deck-override"],
      },
      buttons: [{ id: "system", type: "core:overlay-toggle", position: 14 }],
    }

    expect(
      describeEditorSurfaces({ decks: [deck], keyCount: 15, revision: 1 })[0],
    ).toMatchObject({
      sourceDeckId: "addon:deck",
      projectionId: "addon:deck-p1",
      isOverlay: true,
      editable: false,
      addonOwner: deck.addonOwner,
      reservedPositions: [14],
      buttons: [{ sourceTarget: null }],
    })
  })
})
