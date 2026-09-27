import { useEffect, useState } from "react"
import {
  Button,
  Card,
  Input,
  ListBox,
  Select,
  Switch,
  Tabs,
} from "@heroui/react"
import { Check, CircleX, Layers, Plus, Rows3 } from "lucide-react"

import type { DeviceModelSpec } from "@sirenodeck/sirenodeck"

import type { WsClient } from "../bridge"
import { DeckFrame } from "../DeckFrame"
import type { AddonInventory } from "./AddonsPage"
import {
  ButtonConfigEditor,
  type JsonSchema,
  type ValidationState,
} from "./ButtonConfigEditor"
import { IconPicker, type PendingIconAsset } from "../components/IconPicker"

type Button = Record<string, unknown> | string
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
  readonly themeVariants?: Record<
    string,
    { background: string; border: string; foreground: string }
  >
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
  readonly validation?: ValidationState | null
}

let requestNumber = 0
const nextRequestId = (): string => `editor-${Date.now()}-${requestNumber++}`

const isButton = (button: Button): button is Record<string, unknown> =>
  typeof button === "object" && button !== null && !Array.isArray(button)

type DragData =
  | { kind: "palette"; button: Record<string, unknown> }
  | { kind: "existing"; index: number }

const ButtonAppearanceFields = ({
  value,
  variants,
  onChange,
  onAsset,
}: {
  readonly value: { icon: string; variant: string }
  readonly variants: NonNullable<EditorState["themeVariants"]>
  readonly onChange: (value: { icon: string; variant: string }) => void
  readonly onAsset: (asset?: PendingIconAsset) => void
}) => (
  <div className="grid gap-3 rounded-lg border border-separator p-3 sm:grid-cols-2">
    <IconPicker
      label="Button icon"
      value={value.icon}
      onApply={(icon, asset) => {
        onChange({ ...value, icon })
        onAsset(asset)
      }}
    />
    <label className="grid gap-1 text-sm">
      Theme variant
      <Select
        aria-label="Theme variant"
        selectedKey={value.variant || "default"}
        onSelectionChange={(key) =>
          onChange({
            ...value,
            variant: String(key) === "default" ? "" : String(key),
          })
        }
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {Object.entries(variants).map(([name, colors]) => (
              <ListBox.Item key={name} id={name} textValue={name}>
                <span
                  aria-hidden="true"
                  className="size-4 rounded-full border"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  }}
                />
                {name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {value.variant !== "" && variants[value.variant] !== undefined && (
        <span
          className="h-2 rounded-full"
          style={{ backgroundColor: variants[value.variant]!.background }}
        />
      )}
    </label>
  </div>
)

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
  validation = null,
}: EditorPageProps) => {
  const [deckId, setDeckId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [clipboard, setClipboard] = useState<Button | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingButton, setPendingButton] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [pendingPosition, setPendingPosition] = useState<number | null>(null)
  const [newPage, setNewPage] = useState(false)
  const [newPageId, setNewPageId] = useState("")
  const [newPageName, setNewPageName] = useState("")
  const [newPageIcon, setNewPageIcon] = useState("")
  const [newPageBackground, setNewPageBackground] = useState("")
  const [newPagePaginated, setNewPagePaginated] = useState(false)
  const [positionUnset, setPositionUnset] = useState(false)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [deckDraft, setDeckDraft] = useState<DeckDraft | null>(null)
  const [creatingDeck, setCreatingDeck] = useState(false)
  const [newDeckId, setNewDeckId] = useState("")
  const [newDeckName, setNewDeckName] = useState("")
  const [buttonAppearance, setButtonAppearance] = useState<{
    icon: string
    variant: string
  }>({ icon: "", variant: "" })
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
    if (result === null) return
    if (
      assetWriteQueue !== null &&
      result.requestId === assetWriteQueue.requestId
    ) {
      if (!result.ok) {
        setMessage(result.error ?? "Could not save icon asset")
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
    setMessage(result.ok ? "Saved" : (result.error ?? "Edit failed"))
    if (result.requestId !== pendingRequestId) return
    if (result.ok) {
      if (newPage) setDeckId(newPageId.trim())
      setPendingButton(null)
      setPendingPosition(null)
      setNewPage(false)
      setPendingRequestId(null)
    }
  }, [
    assetWriteQueue,
    newPage,
    newPageId,
    pendingButton,
    pendingRequestId,
    result,
    state?.revision,
    wsClient,
  ])

  const config = (state?.config ?? {}) as Config
  const decks = Object.entries(config.decks ?? {})
  const activeDeckId = deckId ?? decks[0]?.[0] ?? null
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
  const firstFreePosition = (): number => {
    const used = new Set(positions)
    for (let position = 0; position < (device?.keyCount ?? 15); position += 1) {
      if (!used.has(position)) return position
    }
    return positions.length
  }
  const selected = selectedIndex === null ? undefined : buttons[selectedIndex]
  const selectedType =
    selected === undefined
      ? null
      : isButton(selected) && typeof selected.type === "string"
        ? selected.type
        : String(selected)
  const selectedGenerated =
    selected !== undefined &&
    ((isButton(selected) && selected.generated === true) ||
      addonInventory?.addons.some((addon) =>
        addon.buttonTypes.some(
          (type) => type.type === selectedType && type.generated === true,
        ),
      ) === true)
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
  const [editionTab, setEditionTab] = useState<"buttons" | "decks">("buttons")
  const [showButtonTypes, setShowButtonTypes] = useState(false)
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null)
  const [buttonDraft, setButtonDraft] = useState<Record<
    string,
    unknown
  > | null>(null)

  useEffect(() => {
    if (selectedPosition !== null) {
      const index = positions.indexOf(selectedPosition)
      if (index >= 0 && index !== selectedIndex) setSelectedIndex(index)
    }
    if (selectedIndex !== null && selectedIndex >= buttons.length) {
      setSelectedIndex(buttons.length === 0 ? null : buttons.length - 1)
    }
  }, [activeDeckId, selectedIndex, selectedPosition, state?.revision])

  useEffect(() => setButtonDraft(null), [pendingButton, selectedIndex])

  useEffect(() => {
    const current = pendingButton ?? selected
    const fields =
      typeof current === "object" && current !== null && !Array.isArray(current)
        ? current
        : {}
    setButtonAppearance({
      icon: typeof fields.icon === "string" ? fields.icon : "",
      variant: typeof fields.variant === "string" ? fields.variant : "",
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
  }

  const beginInsert = (
    button: Record<string, unknown>,
    position?: number,
  ): void => {
    setPendingButton(button)
    setPendingPosition(position ?? firstFreePosition())
    setPositionUnset(false)
    setNewPage(false)
    setNewPageId(activeDeckId === null ? "page-2" : `${activeDeckId}-p2`)
    setNewPageName(
      `${config.decks?.[activeDeckId ?? ""]?.name ?? activeDeckId ?? "Deck"} 2`,
    )
    setSelectedIndex(null)
  }

  const add = (index?: number): void => {
    if (activeDeckId === null) return
    const button =
      clipboard === null ? { type: "core:action", config: {} } : clipboard
    if (selectedPosition !== null)
      return beginInsert(
        isButton(button) ? button : { type: button, config: {} },
        selectedPosition,
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

  const dragStart = (event: React.DragEvent, data: DragData): void => {
    event.dataTransfer.effectAllowed = "copyMove"
    event.dataTransfer.setData("application/json", JSON.stringify(data))
  }

  const saveConfig = (config: Record<string, unknown>): void => {
    if (
      activeDeckId === null ||
      selectedIndex === null ||
      selected === undefined
    )
      return
    const button = isButton(selected) ? selected : { type: selected }
    persistMutation({
      kind: "update",
      deckId: activeDeckId,
      index: selectedIndex,
      button: {
        ...button,
        ...buttonAppearance,
        ...(buttonAppearance.icon === "" ? { icon: undefined } : {}),
        ...(buttonAppearance.variant === "" ? { variant: undefined } : {}),
        config,
      },
    })
  }

  const addPending = (config: Record<string, unknown>): void => {
    if (activeDeckId === null || pendingButton === null) return
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
    if (index >= 0 && !window.confirm(`Replace key ${position}?`)) return
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
        ...(buttonAppearance.icon === "" ? { icon: undefined } : {}),
        ...(buttonAppearance.variant === "" ? { variant: undefined } : {}),
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
                    fitToContainer
                    highlightedKey={
                      hoveredPosition ?? selectedPosition ?? pendingPosition
                    }
                    previewConfig={
                      buttonDraft === null
                        ? null
                        : {
                            index:
                              pendingButton === null
                                ? (selectedIndex ?? firstFreePosition())
                                : (pendingPosition ?? firstFreePosition()),
                            position:
                              pendingButton === null
                                ? (selectedPosition ??
                                  positions[selectedIndex ?? -1])
                                : (pendingPosition ?? firstFreePosition()),
                            ...(pendingButton !== null
                              ? { type: String(pendingButton.type ?? "") }
                              : {}),
                            config: buttonDraft,
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
                {editionTab === "buttons" &&
                  pendingButton === null &&
                  !showButtonTypes &&
                  selected === undefined && (
                    <Button
                      type="button"
                      variant="primary"
                      className="order-first"
                      onPress={() => setShowButtonTypes((value) => !value)}
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      New button
                    </Button>
                  )}
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
                                setDeckId(previousPage)
                                onDeckSelect?.(previousPage)
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
                                setDeckId(nextPage)
                                onDeckSelect?.(nextPage)
                              }}
                            >
                              Next page
                            </Button>
                          </div>
                        )}
                        <p className="text-sm text-neutral-300 sm:col-span-2">
                          <span className="block text-xs uppercase tracking-wider text-neutral-500">
                            Name
                          </span>
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
                        </p>
                        <Input
                          aria-label="Deck icon"
                          label="Icon"
                          value={deckDraft.icon}
                          onChange={(event) =>
                            setDeckDraft({
                              ...deckDraft,
                              icon: event.target.value,
                            })
                          }
                        />
                        <Input
                          aria-label="Deck background"
                          label="Background"
                          value={deckDraft.background}
                          onChange={(event) =>
                            setDeckDraft({
                              ...deckDraft,
                              background: event.target.value,
                            })
                          }
                        />
                        <Input
                          aria-label="Trigger process"
                          label="Trigger process"
                          placeholder="chrome, slack"
                          value={deckDraft.processName}
                          onChange={(event) =>
                            setDeckDraft({
                              ...deckDraft,
                              processName: event.target.value,
                            })
                          }
                        />
                        <Input
                          aria-label="Trigger window"
                          label="Trigger window"
                          value={deckDraft.windowName}
                          onChange={(event) =>
                            setDeckDraft({
                              ...deckDraft,
                              windowName: event.target.value,
                            })
                          }
                        />
                        <Switch
                          isSelected={deckDraft.paginated}
                          onChange={(event) =>
                            setDeckDraft({
                              ...deckDraft,
                              paginated: event.target.checked,
                            })
                          }
                        >
                          Paginated
                        </Switch>
                        <Switch
                          isSelected={deckDraft.autoShow}
                          onChange={(event) =>
                            setDeckDraft({
                              ...deckDraft,
                              autoShow: event.target.checked,
                            })
                          }
                        >
                          Auto show overlay
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
                          <Input
                            aria-label="New deck ID"
                            label="ID"
                            value={newDeckId}
                            onChange={(event) =>
                              setNewDeckId(event.target.value)
                            }
                          />
                          <Input
                            aria-label="New deck name"
                            label="Name"
                            value={newDeckName}
                            onChange={(event) =>
                              setNewDeckName(event.target.value)
                            }
                          />
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
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setDeckId(id)
                              setSelectedIndex(null)
                              setSelectedPosition(null)
                              onDeckSelect?.(id)
                            }}
                            aria-pressed={id === activeDeckId}
                            className="min-h-10 rounded border border-neutral-800 px-3 text-left text-sm aria-pressed:border-sky-400 aria-pressed:bg-sky-500/15"
                          >
                            <span className="block truncate">
                              {deck.name ?? id}
                            </span>
                            <span className="block truncate text-xs text-neutral-500">
                              #{id}
                            </span>
                          </button>
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
                            <button
                              key={deck.id}
                              type="button"
                              onClick={() => {
                                sendMutation({
                                  kind: "set-addon-deck-override",
                                  addonIndex: deck.addonIndex,
                                  deckId: deck.overrideKey,
                                  override: {},
                                })
                                setMessage("Saving addon override…")
                              }}
                              className="min-h-10 rounded border border-neutral-800 px-3 text-left text-sm text-amber-300 hover:border-amber-400"
                            >
                              {deck.id}
                            </button>
                          ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}
              {editionTab === "buttons" && (
                <section aria-labelledby="button-config-title">
                  <div className="mb-3">
                    <h3
                      id="button-config-title"
                      className="text-xs font-semibold uppercase tracking-wider text-neutral-500"
                    >
                      Selected button
                    </h3>
                  </div>
                  {showButtonTypes && (
                    <div className="mb-4 grid gap-2 rounded-lg border border-neutral-800 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted">
                          Choose a button type.
                        </p>
                        <Button
                          type="button"
                          variant="tertiary"
                          onPress={() => setShowButtonTypes(false)}
                        >
                          <CircleX aria-hidden="true" className="size-4" />
                          Cancel
                        </Button>
                      </div>
                      {addonInventory?.addons
                        .filter((addon) => !addon.internal)
                        .flatMap((addon) =>
                          addon.buttonTypes
                            .filter((type) => !type.internal)
                            .map((type) => type.type),
                        )
                        .map((type) => (
                          <button
                            key={type}
                            type="button"
                            draggable
                            onDragStart={(event) =>
                              dragStart(event, {
                                kind: "palette",
                                button: { type, config: {} },
                              })
                            }
                            onClick={() => {
                              beginInsert({ type, config: {} })
                              setShowButtonTypes(false)
                            }}
                            className="min-h-10 rounded border border-neutral-800 px-3 text-left text-sm text-emerald-300 hover:border-emerald-500"
                          >
                            {type}
                          </button>
                        ))}
                    </div>
                  )}
                  {pendingButton === null && selected !== undefined && (
                    <div className="mb-3 grid grid-cols-[repeat(5,30px)] justify-center gap-[3px] rounded-lg border border-separator p-3">
                      {Array.from(
                        { length: device?.keyCount ?? 15 },
                        (_, position) => {
                          const occupied = positions.includes(position)
                          return (
                            <button
                              key={position}
                              type="button"
                              aria-label={`Position ${position}`}
                              aria-pressed={selectedPosition === position}
                              onClick={() => {
                                if (occupied) selectPosition(position)
                              }}
                              onMouseEnter={() => setHoveredPosition(position)}
                              onMouseLeave={() => setHoveredPosition(null)}
                              className={`h-[30px] w-[30px] rounded border border-separator text-xs text-muted hover:border-primary ${selectedPosition === position ? "border-primary bg-primary text-primary-foreground" : ""}`}
                            >
                              {position + 1}
                            </button>
                          )
                        },
                      )}
                    </div>
                  )}
                  {pendingButton !== null ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-[auto_repeat(5,30px)] items-center gap-[3px] rounded-lg border border-separator p-3">
                        <Button
                          type="button"
                          variant="tertiary"
                          onPress={() => {
                            setPendingPosition(firstFreePosition())
                            setPositionUnset(false)
                            setNewPage(false)
                          }}
                        >
                          First available
                        </Button>
                        {Array.from(
                          { length: device?.keyCount ?? 15 },
                          (_, position) => {
                            return (
                              <button
                                key={position}
                                type="button"
                                aria-label={`Position ${position}`}
                                aria-pressed={pendingPosition === position}
                                onClick={() => {
                                  if (
                                    position ===
                                    (device?.keyCount ?? 15) - 1
                                  ) {
                                    setPendingPosition(null)
                                    setPositionUnset(true)
                                  } else {
                                    setPendingPosition(position)
                                    setPositionUnset(false)
                                  }
                                  setNewPage(false)
                                }}
                                onMouseEnter={() =>
                                  setHoveredPosition(position)
                                }
                                onMouseLeave={() => setHoveredPosition(null)}
                                className={`h-[30px] w-[30px] rounded border border-separator text-xs text-muted hover:border-primary ${positionUnset && position === (device?.keyCount ?? 15) - 1 ? "border-primary bg-primary text-primary-foreground" : pendingPosition === position ? "border-primary bg-primary text-primary-foreground" : ""}`}
                              >
                                {position === (device?.keyCount ?? 15) - 1
                                  ? "∅"
                                  : position + 1}
                              </button>
                            )
                          },
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pendingButton.type === "core:change-deck" && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewPage(true)
                              setPendingPosition(0)
                            }}
                            className="rounded border border-neutral-700 px-3 py-2 text-xs hover:border-sky-400"
                          >
                            Add new page
                          </button>
                        )}
                      </div>
                      {newPage && (
                        <div className="grid gap-2 rounded-lg border border-neutral-800 p-3">
                          <label className="grid gap-1 text-xs text-neutral-400">
                            Page ID
                            <input
                              value={newPageId}
                              onChange={(event) =>
                                setNewPageId(event.target.value)
                              }
                              className="min-h-10 rounded border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100"
                            />
                          </label>
                          <label className="grid gap-1 text-xs text-neutral-400">
                            Page name
                            <input
                              value={newPageName}
                              onChange={(event) =>
                                setNewPageName(event.target.value)
                              }
                              className="min-h-10 rounded border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100"
                            />
                          </label>
                          <label className="grid gap-1 text-xs text-neutral-400">
                            Icon source
                            <input
                              placeholder="icon://layout-grid"
                              value={newPageIcon}
                              onChange={(event) =>
                                setNewPageIcon(event.target.value)
                              }
                              className="min-h-10 rounded border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100"
                            />
                          </label>
                          <label className="grid gap-1 text-xs text-neutral-400">
                            Background
                            <input
                              value={newPageBackground}
                              onChange={(event) =>
                                setNewPageBackground(event.target.value)
                              }
                              className="min-h-10 rounded border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs text-neutral-400">
                            <input
                              type="checkbox"
                              checked={newPagePaginated}
                              onChange={(event) =>
                                setNewPagePaginated(event.target.checked)
                              }
                            />{" "}
                            Paginated page
                          </label>
                        </div>
                      )}
                      {!selectedGenerated && (
                        <ButtonAppearanceFields
                          value={buttonAppearance}
                          variants={state?.themeVariants ?? {}}
                          onChange={setButtonAppearance}
                          onAsset={(asset) => chooseAsset("button.icon", asset)}
                        />
                      )}
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
                        onPendingAssetChange={(path, asset) =>
                          chooseAsset(`config.${path}`, asset ?? undefined)
                        }
                        onCancel={() => {
                          setPendingButton(null)
                          setPendingPosition(null)
                          setSelectedPosition(null)
                          setSelectedIndex(null)
                        }}
                        onSave={addPending}
                      />
                    </div>
                  ) : selected === undefined ? (
                    <div className="space-y-3">
                      <p className="flex min-h-48 items-center justify-center text-sm text-muted">
                        Select a button using its ⋮ menu.
                      </p>
                      {clipboard !== null && (
                        <button
                          type="button"
                          onClick={() => add()}
                          className="min-h-10 rounded bg-sky-600 px-3 text-sm"
                        >
                          Paste button
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <ButtonAppearanceFields
                        value={buttonAppearance}
                        variants={state?.themeVariants ?? {}}
                        onChange={setButtonAppearance}
                        onAsset={(asset) => chooseAsset("button.icon", asset)}
                      />
                      {!selectedGenerated && (
                        <ButtonConfigEditor
                          key={`${activeDeckId}:${selectedIndex}:${state?.revision ?? 0}`}
                          wsClient={wsClient}
                          revision={state?.revision ?? 0}
                          buttonType={
                            isButton(selected) &&
                            typeof selected.type === "string"
                              ? selected.type
                              : String(selected)
                          }
                          config={isButton(selected) ? selected.config : {}}
                          schema={
                            state?.buttonSchemas?.[
                              isButton(selected) &&
                              typeof selected.type === "string"
                                ? selected.type
                                : String(selected)
                            ]
                          }
                          validation={validation}
                          deckOptions={deckOptions}
                          hideActions
                          onDraftChange={setButtonDraft}
                          onPendingAssetChange={(path, asset) =>
                            chooseAsset(`config.${path}`, asset ?? undefined)
                          }
                          onCancel={() => {
                            setSelectedIndex(null)
                            setSelectedPosition(null)
                          }}
                          onSave={saveConfig}
                        />
                      )}
                    </div>
                  )}
                </section>
              )}
            </Card.Content>
            {(pendingButton !== null ||
              (selected !== undefined && !selectedGenerated)) && (
              <Card.Footer className="mt-auto shrink-0 justify-end gap-2 border-t border-separator">
                <Button
                  type="button"
                  variant="tertiary"
                  onPress={() => {
                    setPendingButton(null)
                    setPendingPosition(null)
                    setSelectedPosition(null)
                    setSelectedIndex(null)
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
          </Card>
        </div>
      )}
    </section>
  )
}
