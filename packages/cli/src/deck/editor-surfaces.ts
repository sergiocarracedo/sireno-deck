import type { RuntimeDeck, RuntimeButton } from "./runtime"
import { paginationReservedPositions } from "@/core/pagination"
import { computeSystemButtonForSlotN1 } from "./system-back-injection"

export type EditorMutationCapability = "update" | "delete" | "reorder"

export interface EditorSourceTarget {
  readonly sourcePath: string
  readonly sourceDeckId: string
  readonly sourceButtonIndex: number
  readonly sourceButtonPath: string
  readonly fingerprint: string
  readonly capability: EditorMutationCapability
}

export interface EditorAddonOwner {
  readonly addonIndex: number
  readonly addonName: string
  readonly overrideKey: string
  readonly capabilities: ReadonlyArray<string>
}

export interface EditorSurfaceButton {
  readonly id: string
  readonly type: string
  readonly position: number
  readonly sourceTarget: EditorSourceTarget | null
}

export interface EditorSurfaceDescriptor {
  readonly id: string
  readonly sourceDeckId: string
  readonly projectionId: string
  readonly pageIndex: number
  readonly isOverlay: boolean
  readonly editable: boolean
  readonly addonOwner: EditorAddonOwner | null
  readonly reservedPositions: number[]
  readonly buttons: EditorSurfaceButton[]
}

export interface DescribeEditorSurfacesOptions {
  readonly decks: ReadonlyArray<RuntimeDeck>
  readonly keyCount: number
  readonly revision: number
  readonly systemState?: {
    navStackDepth: number
    hasOverlayDeckAvailable: boolean
    lockActive?: boolean
    inOverlayMode?: boolean
  }
}

export const describeEditorSurfaces = ({
  decks,
  keyCount,
  revision: _revision,
  systemState,
}: DescribeEditorSurfacesOptions): EditorSurfaceDescriptor[] =>
  decks.map((deck) => {
    const systemType = computeSystemButtonForSlotN1(deck, {
      navStackDepth: systemState?.navStackDepth ?? 1,
      hasOverlayDeckAvailable: systemState?.hasOverlayDeckAvailable ?? false,
      lockActive: systemState?.lockActive,
      inOverlayMode: systemState?.inOverlayMode,
    })
    const reservedPositions = new Set(
      paginationReservedPositions(keyCount, deck.paginated === true),
    )
    if (systemType !== null) reservedPositions.add(keyCount - 1)
    return {
      id: deck.id,
      sourceDeckId: deck.sourceDeckId ?? deck.id,
      projectionId: deck.projectionId ?? deck.id,
      pageIndex: deck.pageIndex ?? 0,
      isOverlay: deck.isOverlay === true || deck.isOverlayDeck === true,
      editable: deck.editable === true,
      addonOwner: deck.addonOwner ?? null,
      reservedPositions: [...reservedPositions].sort((a, b) => a - b),
      buttons: deck.buttons.map((button: RuntimeButton) => ({
        id: button.id,
        type: button.type,
        position: button.position ?? -1,
        sourceTarget: button.sourceTarget ?? null,
      })),
    }
  })
