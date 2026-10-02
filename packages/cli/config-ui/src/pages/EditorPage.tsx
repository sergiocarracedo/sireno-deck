import { useEffect, useMemo, useRef, useState } from "react"
import {
  Button,
  Card,
  Fieldset,
  Input,
  Label,
  Modal,
  Switch,
  Tabs,
  TextField,
  toast,
} from "@heroui/react"
import { Check, CircleX, Layers, Plus, Rows3 } from "lucide-react"

import type { DeviceModelSpec } from "@sirenodeck/sirenodeck"
import { isSystemButtonType } from "@/deck/system-buttons/types"

import type { WsClient } from "../bridge"
import { DeckFrame } from "../DeckFrame"
import type { AddonInventory } from "./AddonsPage"
import {
  ButtonConfigEditor,
  type JsonSchema,
  type ValidationState,
} from "./ButtonConfigEditor"
import { ButtonAppearanceFields } from "./ButtonConfigEditor/ButtonAppearanceFields"
import { PositionPicker } from "./ButtonConfigEditor/PositionPicker"
import type {
  ButtonAppearance,
  ButtonThemeVariant,
} from "./ButtonConfigEditor/types"
import type { PendingIconAsset } from "../components/IconPicker"
import {
  ButtonTypePicker,
  type ButtonTypeOption,
} from "./ButtonConfigEditor/ButtonTypePicker"
import { isValidActionValue } from "../components/ActionValueEditor"

type Button = Record<string, unknown> | string
const INLINE_CONTROL_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1"

const gestureConfigKeys = {
  tap: "tap",
  "dbl-tap": "dbltap",
  hold: "hold",
} as const

const withoutOwnedGestures = (
  actions: ButtonAppearance["actions"],
  owned: readonly (keyof typeof gestureConfigKeys)[],
): ButtonAppearance["actions"] => {
  const next = { ...actions }
  for (const gesture of owned) delete next[gestureConfigKeys[gesture]]
  return next
}
type Config = {
  theme?: string | { src: string; global?: boolean }
  decks?: Record<
    string,
    {
      name?: string
      label?: string
      columns?: number
      rows?: number
      icon?: string
      background?: string
      paginated?: boolean
      autoShow?: boolean
      trigger?: {
        process_name?: string | string[]
        window_name?: string | string[]
      }
      buttons?: Button[]
    }
  >
}

interface DeckDraft {
  name: string
  columns: string
  rows: string
  icon: string
  background: string
  paginated: boolean
  autoShow: boolean
  processName: string
  windowName: string
}

export interface ThemeOption {
  readonly name: string
  readonly active?: boolean
}

export interface EditorState {
  readonly revision: number
  readonly config: unknown
  readonly sources: string[]
  readonly sourceContents?: Record<string, string>
  readonly themes?: readonly ThemeOption[]
  readonly themeVariants?: Record<string, ButtonThemeVariant>
  readonly surfaces?: Array<{
    readonly id: string
    readonly buttons: Array<{
      readonly type: string
      readonly position: number
    }>
  }>
  readonly buttonSchemas?: Record<string, JsonSchema>
  readonly canUndo: boolean
}

interface MutationResult {
  readonly requestId: string
  readonly ok: boolean
  readonly error?: string
}

export interface EditorPageProps {
  readonly wsClient: WsClient | null
  readonly state: EditorState | null
  readonly result: MutationResult | null
  readonly addonInventory?: AddonInventory | null
  readonly frontendUrl?: string
  readonly device?: DeviceModelSpec
  readonly token?: string
  readonly onGesture?: (msg: {
    deckId: string
    position: number
    gesture: "tap" | "dbl-tap" | "hold"
  }) => void
  readonly onDeckSelect?: (deckId: string) => void
  readonly runtimeDeckId?: string | null
  readonly validation?: ValidationState | null
}

let requestNumber = 0
const nextRequestId = (): string => `editor-${Date.now()}-${requestNumber++}`

const isButton = (button: Button): button is Record<string, unknown> =>
  typeof button === "object" && button !== null && !Array.isArray(button)

type DragData =
  | { kind: "palette"; button: Record<string, unknown> }
  | { kind: "existing"; index: number }

const readDragData = (event: React.DragEvent): DragData | null => {
  try {
    const value = JSON.parse(event.dataTransfer.getData("application/json"))
    if (
      value?.kind === "palette" &&
      typeof value.button === "object" &&
      value.button !== null
    )
      return value as DragData
    if (value?.kind === "existing" && typeof value.index === "number")
      return value as DragData
  } catch {
    // Ignore drops from outside the editor.
  }
  return null
}

const buttonPositions = (buttons: Button[]): number[] => {
  const used = new Set<number>()
  let next = 0
  return buttons.map((button) => {
    const explicit =
      isButton(button) && typeof button.position === "number"
        ? button.position
        : undefined
    const position =
      explicit !== undefined && explicit >= 0 && !used.has(explicit)
        ? explicit
        : (() => {
            while (used.has(next)) next += 1
            return next
          })()
    used.add(position)
    next = Math.max(next, position + 1)
    return position
  })
}

export const EditorPage = ({
  wsClient,
  state,
  result,
  addonInventory = null,
  frontendUrl,
  device,
  token,
  onGesture,
  onDeckSelect,
  runtimeDeckId,
  validation = null,
}: EditorPageProps) => {
  const [deckSelection, setDeckSelection] = useState<{
    readonly id: string
    readonly runtimeDeckId: string | null
  } | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [clipboard, setClipboard] = useState<Button | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingButton, setPendingButton] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [pendingPosition, setPendingPosition] = useState<number | null>(null)
  const [positionToReplace, setPositionToReplace] = useState<number | null>(
    null,
  )
  const [newPage, setNewPage] = useState(false)
  const [newPageId, setNewPageId] = useState("")
  const [newPageName, setNewPageName] = useState("")
  const [newPageIcon, setNewPageIcon] = useState("")
  const [newPageBackground, setNewPageBackground] = useState("")
  const [newPagePaginated, setNewPagePaginated] = useState(false)
  const [positionUnset, setPositionUnset] = useState(false)
  const [buttonTypeOverride, setButtonTypeOverride] = useState<string | null>(
    null,
  )
  const [selectionDeckId, setSelectionDeckId] = useState<string | null>(null)
  const skipPositionSelectionSync = useRef(false)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const lastResultId = useRef<string | null>(null)
  const [deckDraft, setDeckDraft] = useState<DeckDraft | null>(null)
  const [creatingDeck, setCreatingDeck] = useState(false)
  const [newDeckId, setNewDeckId] = useState("")
  const [newDeckName, setNewDeckName] = useState("")
  const [buttonAppearance, setButtonAppearance] = useState<ButtonAppearance>({
    variant: "",
    actions: {},
  })
  const [pendingAssets, setPendingAssets] = useState<
    Record<string, PendingIconAsset>
  >({})
  const [assetWriteQueue, setAssetWriteQueue] = useState<{
    requestId: string
    assets: PendingIconAsset[]
    next: number
    mutation: Record<string, unknown>
  } | null>(null)

  useEffect(() => {
    wsClient?.send(JSON.stringify({ type: "editor-state-request" }))
  }, [wsClient])

  useEffect(() => {
    if (result === null || result.requestId === lastResultId.current) return
    lastResultId.current = result.requestId
    if (
      assetWriteQueue !== null &&
      result.requestId === assetWriteQueue.requestId
    ) {
      if (!result.ok) {
        toast.danger(result.error ?? "Could not save icon asset")
        setMessage(null)
        setAssetWriteQueue(null)
        return
      }
      const next = assetWriteQueue.next + 1
      const asset = assetWriteQueue.assets[next]
      if (asset !== undefined) {
        const requestId = nextRequestId()
        wsClient?.send(
          JSON.stringify({
            type: "editor-asset-write",
            requestId,
            revision: state?.revision ?? 0,
            filename: asset.filename,
            data: asset.data,
          }),
        )
        setAssetWriteQueue({ ...assetWriteQueue, requestId, next })
      } else {
        const mutationRequestId = sendMutation(assetWriteQueue.mutation)
        if (pendingButton !== null && mutationRequestId !== null)
          setPendingRequestId(mutationRequestId)
        setAssetWriteQueue(null)
        setPendingAssets({})
      }
      return
    }
    if (result.ok) toast.success("Saved")
    else toast.danger(result.error ?? "Edit failed")
    setMessage(null)
    if (result.requestId !== pendingRequestId) return
    if (result.ok) {
      if (newPage) {
        const nextDeckId = newPageId.trim()
        setDeckSelection({
          id: nextDeckId,
          runtimeDeckId: runtimeDeckId ?? null,
        })
        onDeckSelect?.(nextDeckId)
        setSelectedIndex(null)
        setSelectedPosition(null)
        setSelectionDeckId(null)
      }
      setPendingButton(null)
      setPendingPosition(null)
      setNewPage(false)
      setPendingRequestId(null)
    }
  }, [
    assetWriteQueue,
    newPage,
    newPageId,
    onDeckSelect,
    pendingButton,
    pendingRequestId,
    result,
    runtimeDeckId,
    state?.revision,
    wsClient,
  ])

  const config = (state?.config ?? {}) as Config
  const decks = Object.entries(config.decks ?? {})
  const activeDeckId =
    deckSelection?.runtimeDeckId === (runtimeDeckId ?? null)
      ? deckSelection.id
      : (runtimeDeckId ?? decks[0]?.[0] ?? null)
  const activeDeck =
    activeDeckId === null ? undefined : config.decks?.[activeDeckId]
  const buttons =
    activeDeckId === null ? [] : (config.decks?.[activeDeckId]?.buttons ?? [])
  const pageMatch = activeDeckId?.match(/^(.+)-p(\d+)$/)
  const pageBase = pageMatch?.[1] ?? activeDeckId
  const pageNumber =
    pageMatch === null || pageMatch === undefined ? 1 : Number(pageMatch[2])
  const previousPage =
    pageNumber > 1 ? `${pageBase}-p${pageNumber - 1}` : pageBase
  const nextPage = `${pageBase}-p${pageNumber + 1}`
  const hasPreviousPage =
    previousPage !== activeDeckId && decks.some(([id]) => id === previousPage)
  const hasNextPage = decks.some(([id]) => id === nextPage)
  const positions = buttonPositions(buttons)

  useEffect(() => {
    if (activeDeckId === null || activeDeck === undefined) {
      setDeckDraft(null)
      return
    }
    const processName = activeDeck.trigger?.process_name
    const windowName = activeDeck.trigger?.window_name
    setDeckDraft({
      name: activeDeck.name ?? activeDeckId,
      columns:
        activeDeck.columns === undefined ? "" : String(activeDeck.columns),
      rows: activeDeck.rows === undefined ? "" : String(activeDeck.rows),
      icon: activeDeck.icon ?? "",
      background: activeDeck.background ?? "",
      paginated: activeDeck.paginated === true,
      autoShow: activeDeck.autoShow === true,
      processName: Array.isArray(processName)
        ? processName.join(", ")
        : (processName ?? ""),
      windowName: Array.isArray(windowName)
        ? windowName.join(", ")
        : (windowName ?? ""),
    })
  }, [activeDeckId, state?.revision])
  const selected =
    selectionDeckId === activeDeckId && selectedIndex !== null
      ? buttons[selectedIndex]
      : undefined
  const activeSelectedPosition =
    selectionDeckId === activeDeckId ? selectedPosition : null
  const selectedType =
    selected === undefined
      ? null
      : isButton(selected) && typeof selected.type === "string"
        ? selected.type
        : String(selected)
  const currentButtonType =
    pendingButton?.type ?? buttonTypeOverride ?? selectedType
  const selectedGenerated =
    selected !== undefined &&
    ((isButton(selected) && selected.generated === true) ||
      addonInventory?.addons.some((addon) =>
        addon.buttonTypes.some(
          (type) => type.type === selectedType && type.generated === true,
        ),
      ) === true)
  const buttonSchema =
    currentButtonType === undefined || currentButtonType === null
      ? undefined
      : state?.buttonSchemas?.[String(currentButtonType)]
  const deckOptions = [
    ...decks.map(([id, deck]) => ({ id, name: deck.name ?? id })),
    ...(addonInventory?.addons ?? []).flatMap((addon) =>
      addon.internal
        ? []
        : addon.decks
            .filter((deck) => !deck.internal)
            .map((deck) => ({ id: deck.id, name: deck.id })),
    ),
  ].filter(
    (deck, index, all) =>
      all.findIndex((item) => item.id === deck.id) === index,
  )
  const addableButtonTypes: ButtonTypeOption[] = [
    ...(addonInventory?.addons ?? []).flatMap((addon) =>
      addon.buttonTypes
        .filter((buttonType) => !buttonType.internal)
        .map((buttonType) => ({
          addon: addon.name,
          type: buttonType.type,
          defaultConfig: buttonType.defaultConfig,
          gestureHandlers: buttonType.gestureHandlers,
        })),
    ),
  ].filter(
    (buttonType, index, all) =>
      all.findIndex((candidate) => candidate.type === buttonType.type) ===
      index,
  )
  const currentButtonTypeInfo = addonInventory?.addons
    .flatMap((addon) => addon.buttonTypes)
    .find((buttonType) => buttonType.type === currentButtonType)
  const ownedGestures = currentButtonTypeInfo?.gestureHandlers ?? []
  const buttonEditorConfig = useMemo(() => {
    if (buttonTypeOverride !== null)
      return currentButtonTypeInfo?.defaultConfig ?? {}
    const config =
      isButton(selected) &&
      typeof selected.config === "object" &&
      selected.config !== null &&
      !Array.isArray(selected.config)
        ? { ...(selected.config as Record<string, unknown>) }
        : {}
    if (isButton(selected)) {
      for (const key of ["icon", "label"] as const) {
        if (
          buttonSchema?.properties?.[key] !== undefined &&
          typeof selected[key] === "string"
        )
          config[key] = selected[key]
      }
    }
    return config
  }, [buttonSchema, buttonTypeOverride, currentButtonTypeInfo, selected])
  const activeSurface = state?.surfaces?.find(
    (surface) => surface.id === activeDeckId,
  )
  const systemPositions =
    activeSurface?.buttons
      .filter((button) => isSystemButtonType(button.type))
      .map((button) => button.position) ?? []
  const firstFreePosition = (): number | undefined => {
    const used = new Set([...positions, ...systemPositions])
    for (let position = 0; position < (device?.keyCount ?? 15); position += 1) {
      if (!used.has(position)) return position
    }
    return undefined
  }
  const [editionTab, setEditionTab] = useState<"buttons" | "decks">("buttons")
  const [showButtonTypes, setShowButtonTypes] = useState(false)
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null)
  const [buttonDraft, setButtonDraft] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [buttonPreviewDraft, setButtonPreviewDraft] = useState<Record<
    string,
    unknown
  > | null>(null)

  const changeDeck = (nextDeckId: string): void => {
    setDeckSelection({
      id: nextDeckId,
      runtimeDeckId: runtimeDeckId ?? null,
    })
    setSelectedIndex(null)
    setSelectedPosition(null)
    setSelectionDeckId(null)
    setPendingButton(null)
    setPendingPosition(null)
    setPositionToReplace(null)
    setButtonTypeOverride(null)
    setShowButtonTypes(false)
    setButtonDraft(null)
    setButtonPreviewDraft(null)
    setPendingAssets({})
    onDeckSelect?.(nextDeckId)
  }

  const previousActiveDeckId = useRef(activeDeckId)
  const previousRuntimeDeckId = useRef(runtimeDeckId)

  useEffect(() => {
    if (previousRuntimeDeckId.current === runtimeDeckId) return
    previousRuntimeDeckId.current = runtimeDeckId
    setDeckSelection(null)
  }, [runtimeDeckId])

  useEffect(() => {
    if (previousActiveDeckId.current === activeDeckId) return
    previousActiveDeckId.current = activeDeckId
    setSelectedIndex(null)
    setSelectedPosition(null)
    setSelectionDeckId(null)
    setPendingButton(null)
    setPendingPosition(null)
    setPositionToReplace(null)
    setButtonTypeOverride(null)
    setShowButtonTypes(false)
    setButtonDraft(null)
  }, [activeDeckId])

  useEffect(() => {
    if (selectionDeckId !== activeDeckId) return
    if (skipPositionSelectionSync.current) {
      skipPositionSelectionSync.current = false
      return
    }
    if (activeSelectedPosition !== null) {
      const index = positions.indexOf(activeSelectedPosition)
      if (index >= 0 && index !== selectedIndex) setSelectedIndex(index)
    }
    if (selectedIndex !== null && selectedIndex >= buttons.length) {
      setSelectedIndex(buttons.length === 0 ? null : buttons.length - 1)
    }
  }, [
    activeDeckId,
    activeSelectedPosition,
    selectedIndex,
    selectionDeckId,
    state?.revision,
  ])

  useEffect(
    () => setButtonDraft(null),
    [buttonTypeOverride, pendingButton, selectedIndex],
  )
  useEffect(
    () => setButtonPreviewDraft(null),
    [buttonTypeOverride, pendingButton, selectedIndex],
  )
  useEffect(() => setButtonTypeOverride(null), [activeDeckId, selectedIndex])

  useEffect(() => {
    const current = pendingButton ?? selected
    const fields =
      typeof current === "object" && current !== null && !Array.isArray(current)
        ? current
        : {}
    setButtonAppearance({
      variant: typeof fields.variant === "string" ? fields.variant : "",
      actions:
        typeof fields.actions === "object" && fields.actions !== null
          ? (fields.actions as ButtonAppearance["actions"])
          : {},
    })
    setPendingAssets({})
  }, [activeDeckId, pendingButton, selected, selectedIndex, state?.revision])

  const chooseAsset = (
    path: string,
    asset: PendingIconAsset | undefined,
  ): void =>
    setPendingAssets((current) => {
      const next = { ...current }
      if (asset === undefined) delete next[path]
      else next[path] = asset
      return next
    })

  const sendMutation = (mutation: Record<string, unknown>): string | null => {
    if (state === null) return null
    const requestId = nextRequestId()
    wsClient?.send(
      JSON.stringify({
        type: "editor-mutate",
        requestId,
        revision: state.revision,
        mutation,
      }),
    )
    setMessage("Saving…")
    return requestId
  }

  const persistMutation = (mutation: Record<string, unknown>): void => {
    const assets = Object.values(pendingAssets)
    if (assets.length === 0) {
      const requestId = sendMutation(mutation)
      if (pendingButton !== null && requestId !== null)
        setPendingRequestId(requestId)
      setPendingAssets({})
      return
    }
    const first = assets[0]!
    const requestId = nextRequestId()
    wsClient?.send(
      JSON.stringify({
        type: "editor-asset-write",
        requestId,
        revision: state?.revision ?? 0,
        filename: first.filename,
        data: first.data,
      }),
    )
    setAssetWriteQueue({ requestId, assets, next: 0, mutation })
    setMessage("Saving icon asset…")
  }

  const selectPosition = (position: number): void => {
    const index = buttons.findIndex((_, i) => positions[i] === position)
    setSelectedPosition(position)
    setSelectedIndex(index === -1 ? null : index)
    setSelectionDeckId(activeDeckId)
  }

  const stagePendingPosition = (position: number): void => {
    setPendingPosition(position)
    setPositionUnset(false)
    setNewPage(false)
  }

  const moveSelectedToPosition = (position: number): void => {
    if (selectedIndex === null || activeDeckId === null) return
    const targetIndex = positions.indexOf(position)
    if (targetIndex >= 0 && targetIndex !== selectedIndex) {
      skipPositionSelectionSync.current = true
      sendMutation({
        kind: "move-position",
        deckId: activeDeckId,
        from: selectedIndex,
        to: targetIndex,
      })
    }
    setSelectedPosition(position)
    setSelectionDeckId(activeDeckId)
  }

  const beginInsert = (
    button: Record<string, unknown>,
    position?: number,
  ): void => {
    setShowButtonTypes(false)
    setPendingButton(button)
    setPendingPosition(position ?? firstFreePosition() ?? null)
    setPositionToReplace(null)
    setPositionUnset(false)
    setNewPage(false)
    setNewPageId(activeDeckId === null ? "page-2" : `${activeDeckId}-p2`)
    setNewPageName(
      `${config.decks?.[activeDeckId ?? ""]?.name ?? activeDeckId ?? "Deck"} 2`,
    )
    setSelectedIndex(null)
    setSelectedPosition(null)
    setSelectionDeckId(null)
  }

  const add = (index?: number): void => {
    if (activeDeckId === null) return
    const button =
      clipboard === null ? { type: "core:action", config: {} } : clipboard
    if (activeSelectedPosition !== null)
      return beginInsert(
        isButton(button) ? button : { type: button, config: {} },
        activeSelectedPosition,
      )
    beginInsert(
      isButton(button) ? button : { type: button },
      index === undefined ? undefined : firstFreePosition(),
    )
  }

  const dropAt = (event: React.DragEvent, index: number): void => {
    event.preventDefault()
    if (activeDeckId === null) return
    const data = readDragData(event)
    if (data?.kind === "palette") {
      beginInsert(data.button, index)
    } else if (data?.kind === "existing" && data.index !== index) {
      sendMutation({
        kind: "reorder",
        deckId: activeDeckId,
        from: data.index,
        to: index,
      })
    }
  }

  const keyAction = (
    position: number,
    action: "edit" | "copy" | "duplicate" | "up" | "down" | "delete",
  ): void => {
    const index = positions.indexOf(position)
    const button = index < 0 ? undefined : buttons[index]
    if (action === "edit") return selectPosition(position)
    if (button === undefined || activeDeckId === null) return
    if (action === "copy") {
      setClipboard(button)
      setMessage("Copied")
    } else if (action === "duplicate") {
      sendMutation({
        kind: "add",
        deckId: activeDeckId,
        index: index + 1,
        button,
      })
    } else if (action === "delete") {
      sendMutation({ kind: "delete", deckId: activeDeckId, index })
    } else {
      const to = action === "up" ? index - 1 : index + 1
      if (to >= 0 && to < buttons.length)
        sendMutation({
          kind: "move-position",
          deckId: activeDeckId,
          from: index,
          to,
        })
    }
  }

  const saveConfig = (config: Record<string, unknown>): void => {
    if (
      activeDeckId === null ||
      selectedIndex === null ||
      selected === undefined
    )
      return
    const actions = withoutOwnedGestures(
      buttonAppearance.actions,
      ownedGestures,
    )
    if (!Object.values(actions).every(isValidActionValue)) {
      toast.danger("Fix the keyboard macro before saving")
      return
    }
    const button = isButton(selected) ? { ...selected } : { type: selected }
    delete button.icon
    delete button.label
    const type = buttonTypeOverride ?? selectedType ?? String(button.type)
    persistMutation({
      kind: "update",
      deckId: activeDeckId,
      index: selectedIndex,
      button: {
        ...button,
        type,
        ...buttonAppearance,
        ...(buttonAppearance.variant === "" ? { variant: undefined } : {}),
        ...(Object.values(actions).some(Boolean)
          ? { actions }
          : { actions: undefined }),
        ...(activeSelectedPosition !== null &&
        activeSelectedPosition !== positions[selectedIndex]
          ? { position: activeSelectedPosition }
          : {}),
        config,
      },
    })
  }

  const addPending = (config: Record<string, unknown>): void => {
    if (activeDeckId === null || pendingButton === null) return
    const actions = withoutOwnedGestures(
      buttonAppearance.actions,
      ownedGestures,
    )
    if (!Object.values(actions).every(isValidActionValue)) {
      toast.danger("Fix the keyboard macro before adding this button")
      return
    }
    const position = newPage
      ? 0
      : positionUnset
        ? undefined
        : (pendingPosition ?? firstFreePosition())
    const targetDeckId = newPage ? newPageId.trim() : activeDeckId
    if (
      targetDeckId.length === 0 ||
      (newPage && newPageName.trim().length === 0)
    )
      return
    const index =
      newPage || position === undefined ? -1 : positions.indexOf(position)
    const nextConfig =
      pendingButton.type === "core:change-deck" && newPage
        ? { ...config, deck: targetDeckId }
        : config
    persistMutation({
      kind: "add-button",
      deckId: activeDeckId,
      ...(index >= 0 && !newPage ? { replaceIndex: index } : {}),
      ...(newPage
        ? {
            index: 0,
            newDeck: {
              id: targetDeckId,
              name: newPageName.trim(),
              ...(newPageIcon.trim() ? { icon: newPageIcon.trim() } : {}),
              ...(newPageBackground.trim()
                ? { background: newPageBackground.trim() }
                : {}),
              ...(newPagePaginated ? { paginated: true } : {}),
            },
          }
        : { index: index >= 0 ? index : buttons.length }),
      button: {
        ...pendingButton,
        ...buttonAppearance,
        ...(buttonAppearance.variant === "" ? { variant: undefined } : {}),
        ...(Object.values(actions).some(Boolean)
          ? { actions }
          : { actions: undefined }),
        config: nextConfig,
        ...(position === undefined ? {} : { position }),
      },
    })
  }

  const undo = (): void => {
    if (state === null) return
    wsClient?.send(
      JSON.stringify({
        type: "editor-undo",
        requestId: nextRequestId(),
        revision: state.revision,
      }),
    )
    setMessage("Undoing…")
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-1">
      {message !== null && (
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {message}
        </p>
      )}
      {state === null ? (
        <p className="text-sm text-neutral-400">Loading configured decks…</p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
          <Card
            aria-labelledby="preview-title"
            className="flex min-w-0 min-h-0 flex-col"
          >
            <Card.Header>
              <Card.Title id="preview-title">Live preview</Card.Title>
            </Card.Header>
            <Card.Content className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
              {frontendUrl !== undefined &&
              device !== undefined &&
              activeDeckId !== null ? (
                <div
                  data-testid="editor-preview"
                  onDragOver={(event) => event.preventDefault()}
                  className="overflow-hidden rounded-xl"
                >
                  <DeckFrame
                    frontendUrl={frontendUrl}
                    device={device}
                    deckId={activeDeckId}
                    token={token}
                    onGesture={onGesture}
                    onKeyAction={keyAction}
                    systemPositions={systemPositions}
                    fitToContainer
                    highlightedKey={
                      hoveredPosition ??
                      activeSelectedPosition ??
                      pendingPosition
                    }
                    previewConfig={
                      buttonPreviewDraft === null
                        ? null
                        : {
                            index:
                              pendingButton === null
                                ? (selectedIndex ??
                                  firstFreePosition() ??
                                  buttons.length)
                                : (pendingPosition ??
                                  firstFreePosition() ??
                                  buttons.length),
                            position:
                              pendingButton === null
                                ? (activeSelectedPosition ??
                                  positions[selectedIndex ?? -1])
                                : (pendingPosition ?? firstFreePosition()),
                            ...(currentButtonType !== null &&
                            currentButtonType !== undefined
                              ? { type: String(currentButtonType) }
                              : {}),
                            config: buttonPreviewDraft,
                            appearance: buttonAppearance,
                            assets: Object.values(pendingAssets).map(
                              ({ filename, preview }) => ({
                                filename,
                                preview,
                              }),
                            ),
                          }
                    }
                    onDropPosition={(position, event) =>
                      dropAt(event, position)
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-neutral-500">
                  Preview unavailable until the device is connected.
                </p>
              )}
            </Card.Content>
          </Card>
          <Card
            aria-labelledby="edition-panel-title"
            className="flex min-w-0 min-h-0 flex-col"
          >
            <Card.Header className="flex flex-row items-center justify-between gap-3">
              <Card.Title id="edition-panel-title">Edition panel</Card.Title>
              <div className="flex items-center gap-2">
                {editionTab === "buttons" &&
                  pendingButton === null &&
                  !showButtonTypes &&
                  (selected === undefined || !selectedGenerated) && (
                    <Button
                      type="button"
                      variant="primary"
                      onPress={() => setShowButtonTypes(true)}
                    >
                      {selected === undefined ? (
                        <>
                          <Plus aria-hidden="true" className="size-4" />
                          New button
                        </>
                      ) : (
                        `Change type: ${String(currentButtonType ?? selectedType)}`
                      )}
                    </Button>
                  )}
                <Tabs
                  selectedKey={editionTab}
                  onSelectionChange={(key) =>
                    setEditionTab(String(key) as typeof editionTab)
                  }
                >
                  <Tabs.ListContainer>
                    <Tabs.List className="w-fit rounded-full bg-neutral-800 p-1">
                      <Tabs.Tab
                        id="buttons"
                        className="rounded-full px-3 py-1.5 text-xs"
                      >
                        <Rows3 aria-hidden="true" className="size-4" />
                        Buttons
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab
                        id="decks"
                        className="rounded-full px-3 py-1.5 text-xs"
                      >
                        <Layers aria-hidden="true" className="size-4" />
                        Decks
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                </Tabs>
                {editionTab === "decks" && !creatingDeck && (
                  <Button
                    type="button"
                    variant="primary"
                    className="order-first"
                    onPress={() => setCreatingDeck(true)}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    New deck
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Content className="min-h-0 flex-1 overflow-y-auto">
              {editionTab === "decks" && (
                <div role="tabpanel" aria-label="Decks" className="space-y-4">
                  <section aria-labelledby="deck-config-title">
                    <h3
                      id="deck-config-title"
                      className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"
                    >
                      Active deck
                    </h3>
                    {activeDeckId === null ? (
                      <p className="text-sm text-neutral-500">
                        No deck selected.
                      </p>
                    ) : deckDraft === null ? (
                      <p className="text-sm text-neutral-500">
                        Addon-provided decks are read-only here; edit their
                        configured overrides in YAML.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <p className="text-sm text-neutral-300 sm:col-span-2">
                          <span className="block text-xs uppercase tracking-wider text-neutral-500">
                            ID
                          </span>
                          <code>{activeDeckId}</code>
                        </p>
                        <p className="text-sm text-neutral-300">
                          <span className="block text-xs uppercase tracking-wider text-neutral-500">
                            Buttons
                          </span>
                          {buttons.length}
                        </p>
                        {(hasPreviousPage || hasNextPage) && (
                          <div className="flex gap-2 sm:col-span-2">
                            <Button
                              type="button"
                              variant="tertiary"
                              isDisabled={!hasPreviousPage}
                              onPress={() => {
                                if (!hasPreviousPage) return
                                changeDeck(previousPage)
                              }}
                            >
                              Previous page
                            </Button>
                            <Button
                              type="button"
                              variant="tertiary"
                              isDisabled={!hasNextPage}
                              onPress={() => {
                                if (!hasNextPage) return
                                changeDeck(nextPage)
                              }}
                            >
                              Next page
                            </Button>
                          </div>
                        )}
                        <TextField
                          className={`${INLINE_CONTROL_ROW_CLASS} sm:col-span-2`}
                        >
                          <Label className="min-w-0 break-words">Name</Label>
                          <Input
                            aria-label="Deck name"
                            value={deckDraft.name}
                            onChange={(event) =>
                              setDeckDraft({
                                ...deckDraft,
                                name: event.target.value,
                              })
                            }
                          />
                        </TextField>
                        <TextField className={INLINE_CONTROL_ROW_CLASS}>
                          <Label className="min-w-0 break-words">Icon</Label>
                          <Input
                            aria-label="Deck icon"
                            value={deckDraft.icon}
                            onChange={(event) =>
                              setDeckDraft({
                                ...deckDraft,
                                icon: event.target.value,
                              })
                            }
                          />
                        </TextField>
                        <TextField className={INLINE_CONTROL_ROW_CLASS}>
                          <Label className="min-w-0 break-words">
                            Background
                          </Label>
                          <Input
                            aria-label="Deck background"
                            value={deckDraft.background}
                            onChange={(event) =>
                              setDeckDraft({
                                ...deckDraft,
                                background: event.target.value,
                              })
                            }
                          />
                        </TextField>
                        <TextField className={INLINE_CONTROL_ROW_CLASS}>
                          <Label className="min-w-0 break-words">
                            Trigger process
                          </Label>
                          <Input
                            aria-label="Trigger process"
                            placeholder="chrome, slack"
                            value={deckDraft.processName}
                            onChange={(event) =>
                              setDeckDraft({
                                ...deckDraft,
                                processName: event.target.value,
                              })
                            }
                          />
                        </TextField>
                        <TextField className={INLINE_CONTROL_ROW_CLASS}>
                          <Label className="min-w-0 break-words">
                            Trigger window
                          </Label>
                          <Input
                            aria-label="Trigger window"
                            value={deckDraft.windowName}
                            onChange={(event) =>
                              setDeckDraft({
                                ...deckDraft,
                                windowName: event.target.value,
                              })
                            }
                          />
                        </TextField>
                        <Switch
                          isSelected={deckDraft.paginated}
                          onChange={(paginated) =>
                            setDeckDraft({
                              ...deckDraft,
                              paginated,
                            })
                          }
                          className="w-full min-w-0"
                        >
                          <Switch.Content
                            className={`${INLINE_CONTROL_ROW_CLASS} w-full cursor-pointer`}
                          >
                            <Label>Paginated</Label>
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Content>
                        </Switch>
                        <Switch
                          isSelected={deckDraft.autoShow}
                          onChange={(autoShow) =>
                            setDeckDraft({
                              ...deckDraft,
                              autoShow,
                            })
                          }
                          className="w-full min-w-0"
                        >
                          <Switch.Content
                            className={`${INLINE_CONTROL_ROW_CLASS} w-full cursor-pointer`}
                          >
                            <Label>Auto show overlay</Label>
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Content>
                        </Switch>
                        <Button
                          type="button"
                          variant="primary"
                          onPress={() => {
                            if (activeDeckId === null) return
                            const process = deckDraft.processName
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean)
                            const window = deckDraft.windowName
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean)
                            sendMutation({
                              kind: "update-deck",
                              deckId: activeDeckId,
                              patch: {
                                name: deckDraft.name,
                                icon: deckDraft.icon || null,
                                background: deckDraft.background || null,
                                paginated: deckDraft.paginated,
                                autoShow: deckDraft.autoShow,
                                trigger:
                                  process.length || window.length
                                    ? {
                                        ...(process.length === 1
                                          ? { process_name: process[0] }
                                          : process.length
                                            ? { process_name: process }
                                            : {}),
                                        ...(window.length === 1
                                          ? { window_name: window[0] }
                                          : window.length
                                            ? { window_name: window }
                                            : {}),
                                      }
                                    : null,
                              },
                            })
                          }}
                        >
                          Save deck
                        </Button>
                      </div>
                    )}
                    <div className="border-t border-neutral-800 pt-4">
                      <div className="mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Decks
                        </h3>
                      </div>
                      {creatingDeck && (
                        <div className="mb-3 grid gap-2 rounded-lg border border-neutral-800 p-3">
                          <TextField className={INLINE_CONTROL_ROW_CLASS}>
                            <Label className="min-w-0 break-words">ID</Label>
                            <Input
                              aria-label="New deck ID"
                              value={newDeckId}
                              onChange={(event) =>
                                setNewDeckId(event.target.value)
                              }
                            />
                          </TextField>
                          <TextField className={INLINE_CONTROL_ROW_CLASS}>
                            <Label className="min-w-0 break-words">Name</Label>
                            <Input
                              aria-label="New deck name"
                              value={newDeckName}
                              onChange={(event) =>
                                setNewDeckName(event.target.value)
                              }
                            />
                          </TextField>
                          <Button
                            type="button"
                            variant="primary"
                            isDisabled={newDeckId.trim().length === 0}
                            onPress={() => {
                              const id = newDeckId.trim()
                              const requestId = sendMutation({
                                kind: "create-deck",
                                deck: {
                                  id,
                                  ...(newDeckName.trim()
                                    ? { name: newDeckName.trim() }
                                    : {}),
                                },
                              })
                              if (requestId !== null) {
                                setCreatingDeck(false)
                                setNewDeckId("")
                                setNewDeckName("")
                              }
                            }}
                          >
                            Add deck
                          </Button>
                        </div>
                      )}
                      <div className="grid gap-1">
                        {decks.map(([id, deck]) => (
                          <Button
                            key={id}
                            type="button"
                            size="sm"
                            variant="tertiary"
                            onPress={() => {
                              changeDeck(id)
                            }}
                            aria-pressed={id === activeDeckId}
                            className="min-h-10 h-auto justify-start rounded border border-separator px-3 py-2 text-left text-sm aria-pressed:border-primary aria-pressed:bg-surface-secondary"
                          >
                            <span className="block truncate">
                              {deck.name ?? id}
                            </span>
                            <span className="block truncate text-xs text-neutral-500">
                              #{id}
                            </span>
                          </Button>
                        ))}
                        {addonInventory?.addons
                          .filter((addon) => !addon.internal)
                          .flatMap((addon) =>
                            addon.decks.filter((deck) => !deck.internal),
                          )
                          .filter(
                            (deck) =>
                              deck.generated === true &&
                              deck.addonIndex !== undefined &&
                              deck.overrideKey !== undefined,
                          )
                          .map((deck) => (
                            <Button
                              key={deck.id}
                              type="button"
                              size="sm"
                              variant="tertiary"
                              onPress={() => {
                                sendMutation({
                                  kind: "set-addon-deck-override",
                                  addonIndex: deck.addonIndex,
                                  deckId: deck.overrideKey,
                                  override: {},
                                })
                                setMessage("Saving addon override…")
                              }}
                              className="min-h-10 h-auto justify-start rounded border border-separator px-3 py-2 text-left text-sm text-amber-300 hover:border-amber-400"
                            >
                              {deck.id}
                            </Button>
                          ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}
              {editionTab === "buttons" && (
                <Fieldset
                  aria-labelledby="button-config-title"
                  className={`grid min-h-0 gap-2 ${showButtonTypes ? "h-full grid-rows-[auto_minmax(0,1fr)]" : ""}`}
                >
                  <Fieldset.Legend
                    id="button-config-title"
                    className="flex w-full items-center justify-between gap-2"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {pendingButton === null && selected === undefined
                        ? showButtonTypes
                          ? "New button"
                          : "Button"
                        : "Selected button"}
                    </span>
                  </Fieldset.Legend>
                  {showButtonTypes && pendingButton === null && (
                    <div className="flex min-h-0 min-w-0 items-stretch gap-2">
                      <ButtonTypePicker
                        options={addableButtonTypes}
                        value={
                          selected === undefined
                            ? undefined
                            : String(currentButtonType)
                        }
                        label={
                          selected === undefined
                            ? "Button type"
                            : "Change button type"
                        }
                        onSelect={(option) => {
                          if (selected === undefined) {
                            const config = option.defaultConfig
                            beginInsert(
                              {
                                type: option.type,
                                config:
                                  typeof config === "object" &&
                                  config !== null &&
                                  !Array.isArray(config)
                                    ? config
                                    : {},
                              },
                              activeSelectedPosition ?? undefined,
                            )
                          } else {
                            setButtonTypeOverride(option.type)
                          }
                          setShowButtonTypes(false)
                        }}
                      />
                      <Button
                        type="button"
                        variant="tertiary"
                        className="self-end"
                        onPress={() => setShowButtonTypes(false)}
                      >
                        <CircleX aria-hidden="true" className="size-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                  {!showButtonTypes &&
                    (pendingButton !== null ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {pendingButton.type === "core:change-deck" && (
                            <Button
                              type="button"
                              variant="secondary"
                              onPress={() => {
                                setNewPage(true)
                                setPendingPosition(0)
                              }}
                            >
                              Add new page
                            </Button>
                          )}
                        </div>
                        {newPage && (
                          <Fieldset className="grid gap-2 rounded-lg border border-separator bg-surface-secondary p-2">
                            <Fieldset.Legend className="px-1 text-sm font-medium">
                              New page
                            </Fieldset.Legend>
                            <TextField className={INLINE_CONTROL_ROW_CLASS}>
                              <Label className="min-w-0 break-words">
                                Page ID
                              </Label>
                              <Input
                                aria-label="Page ID"
                                value={newPageId}
                                onChange={(event) =>
                                  setNewPageId(event.target.value)
                                }
                              />
                            </TextField>
                            <TextField className={INLINE_CONTROL_ROW_CLASS}>
                              <Label className="min-w-0 break-words">
                                Page name
                              </Label>
                              <Input
                                aria-label="Page name"
                                value={newPageName}
                                onChange={(event) =>
                                  setNewPageName(event.target.value)
                                }
                              />
                            </TextField>
                            <TextField className={INLINE_CONTROL_ROW_CLASS}>
                              <Label className="min-w-0 break-words">
                                Icon source
                              </Label>
                              <Input
                                aria-label="Icon source"
                                placeholder="icon://layout-grid"
                                value={newPageIcon}
                                onChange={(event) =>
                                  setNewPageIcon(event.target.value)
                                }
                              />
                            </TextField>
                            <TextField className={INLINE_CONTROL_ROW_CLASS}>
                              <Label className="min-w-0 break-words">
                                Background
                              </Label>
                              <Input
                                aria-label="Background"
                                value={newPageBackground}
                                onChange={(event) =>
                                  setNewPageBackground(event.target.value)
                                }
                              />
                            </TextField>
                            <Switch
                              isSelected={newPagePaginated}
                              onChange={setNewPagePaginated}
                              className="w-full min-w-0"
                            >
                              <Switch.Content
                                className={`${INLINE_CONTROL_ROW_CLASS} w-full cursor-pointer`}
                              >
                                <Label>Paginated page</Label>
                                <Switch.Control>
                                  <Switch.Thumb />
                                </Switch.Control>
                              </Switch.Content>
                            </Switch>
                          </Fieldset>
                        )}
                        <ButtonAppearanceFields
                          value={buttonAppearance}
                          variants={state?.themeVariants ?? {}}
                          ownedGestures={ownedGestures}
                          positionControl={
                            <PositionPicker
                              mode="add"
                              keyCount={device?.keyCount ?? 15}
                              selected={pendingPosition}
                              unset={positionUnset}
                              disabledPositions={systemPositions}
                              onHover={setHoveredPosition}
                              onSelect={(position) => {
                                if (systemPositions.includes(position)) return
                                const index = positions.indexOf(position)
                                if (index >= 0) setPositionToReplace(position)
                                else stagePendingPosition(position)
                              }}
                              onUnset={() => {
                                setPendingPosition(null)
                                setPositionToReplace(null)
                                setPositionUnset(true)
                                setNewPage(false)
                              }}
                              onFirstAvailable={() => {
                                const position = firstFreePosition()
                                if (position === undefined) return
                                stagePendingPosition(position)
                              }}
                            />
                          }
                          onChange={setButtonAppearance}
                        />
                        <ButtonConfigEditor
                          key={`pending:${pendingButton.type as string}`}
                          wsClient={wsClient}
                          revision={state?.revision ?? 0}
                          buttonType={String(pendingButton.type ?? "")}
                          config={pendingButton.config ?? {}}
                          schema={
                            state?.buttonSchemas?.[
                              String(pendingButton.type ?? "")
                            ]
                          }
                          validation={validation}
                          deckOptions={deckOptions}
                          saveLabel="Add button"
                          hideActions
                          onDraftChange={setButtonDraft}
                          onPreviewChange={setButtonPreviewDraft}
                          onPendingAssetChange={(path, asset) =>
                            chooseAsset(`config.${path}`, asset ?? undefined)
                          }
                          onCancel={() => {
                            setPendingButton(null)
                            setPendingPosition(null)
                            setPositionToReplace(null)
                            setSelectedPosition(null)
                            setSelectedIndex(null)
                            setButtonTypeOverride(null)
                          }}
                          onSave={addPending}
                        />
                      </div>
                    ) : selected === undefined ? (
                      <div className="space-y-3">
                        <p className="py-3 text-sm text-muted">
                          Select a button using its ⋮ menu.
                        </p>
                        {clipboard !== null && (
                          <Button
                            type="button"
                            variant="secondary"
                            onPress={() => add()}
                            className="min-h-10"
                          >
                            Paste button
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {!selectedGenerated && (
                          <ButtonAppearanceFields
                            value={buttonAppearance}
                            variants={state?.themeVariants ?? {}}
                            ownedGestures={ownedGestures}
                            positionControl={
                              <PositionPicker
                                mode="edit"
                                keyCount={device?.keyCount ?? 15}
                                selected={activeSelectedPosition}
                                disabledPositions={systemPositions}
                                onHover={setHoveredPosition}
                                onSelect={moveSelectedToPosition}
                                onFirstAvailable={() => {
                                  const position = firstFreePosition()
                                  if (position === undefined) return
                                  setSelectedPosition(position)
                                  setSelectionDeckId(activeDeckId)
                                }}
                              />
                            }
                            onChange={setButtonAppearance}
                          />
                        )}
                        {!selectedGenerated && (
                          <ButtonConfigEditor
                            key={`${activeDeckId}:${selectedIndex}:${state?.revision ?? 0}`}
                            wsClient={wsClient}
                            revision={state?.revision ?? 0}
                            buttonType={String(
                              currentButtonType ?? selectedType,
                            )}
                            config={buttonEditorConfig}
                            schema={
                              state?.buttonSchemas?.[
                                String(currentButtonType ?? selectedType)
                              ]
                            }
                            validation={validation}
                            deckOptions={deckOptions}
                            hideActions
                            onDraftChange={setButtonDraft}
                            onPreviewChange={setButtonPreviewDraft}
                            onPendingAssetChange={(path, asset) =>
                              chooseAsset(`config.${path}`, asset ?? undefined)
                            }
                            onCancel={() => {
                              setSelectedIndex(null)
                              setSelectedPosition(null)
                              setButtonTypeOverride(null)
                            }}
                            onSave={saveConfig}
                          />
                        )}
                      </div>
                    ))}
                </Fieldset>
              )}
            </Card.Content>
            {(pendingButton !== null ||
              (selected !== undefined && !selectedGenerated)) &&
              !showButtonTypes && (
                <Card.Footer className="mt-auto shrink-0 justify-end gap-2 border-t border-separator">
                  <Button
                    type="button"
                    variant="tertiary"
                    onPress={() => {
                      setPendingButton(null)
                      setPendingPosition(null)
                      setPositionToReplace(null)
                      setSelectedPosition(null)
                      setSelectedIndex(null)
                      setButtonTypeOverride(null)
                    }}
                  >
                    <CircleX aria-hidden="true" className="size-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    isDisabled={buttonDraft === null}
                    onPress={() => {
                      if (buttonDraft === null) return
                      if (pendingButton !== null) addPending(buttonDraft)
                      else saveConfig(buttonDraft)
                    }}
                  >
                    <Check aria-hidden="true" className="size-4" />
                    {pendingButton === null ? "Save button" : "Add button"}
                  </Button>
                </Card.Footer>
              )}
            <Modal>
              {positionToReplace !== null && (
                <Modal.Backdrop
                  isOpen
                  onOpenChange={(isOpen) => {
                    if (!isOpen) setPositionToReplace(null)
                  }}
                >
                  <Modal.Container placement="center" size="sm">
                    <Modal.Dialog aria-label="Replace button position">
                      <Modal.Header>
                        <Modal.Heading>
                          Replace key {positionToReplace + 1}?
                        </Modal.Heading>
                      </Modal.Header>
                      <Modal.Body>
                        <p>
                          The button currently in this position will be replaced
                          when you add this button.
                        </p>
                      </Modal.Body>
                      <Modal.Footer>
                        <Button
                          type="button"
                          variant="tertiary"
                          onPress={() => setPositionToReplace(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          onPress={() => {
                            stagePendingPosition(positionToReplace)
                            setPositionToReplace(null)
                          }}
                        >
                          Replace key
                        </Button>
                      </Modal.Footer>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              )}
            </Modal>
          </Card>
        </div>
      )}
    </section>
  )
}
