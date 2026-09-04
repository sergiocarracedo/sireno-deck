import { useEffect, useState } from "react"
import { Button, Input, Tabs } from "@heroui/react"

import type { DeviceModelSpec } from "@sirenodeck/cli"

import type { WsClient } from "../bridge"
import { DeckFrame } from "../DeckFrame"
import type { AddonInventory } from "./AddonsPage"
import {
  ButtonConfigEditor,
  type JsonSchema,
  type ValidationState,
} from "./ButtonConfigEditor"

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
  readonly themes?: readonly ThemeOption[]
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

const fieldValue = (button: Button, field: string): string => {
  if (!isButton(button)) return ""
  const value = button[field]
  return value === undefined || value === null ? "" : String(value)
}

const EditorField = ({
  label,
  value,
  type = "text",
  disabled = false,
  onChange,
}: {
  readonly label: string
  readonly value: string
  readonly type?: "text" | "number" | "url"
  readonly disabled?: boolean
  readonly onChange: (value: string) => void
}) => (
  <label className="grid gap-1 text-sm text-neutral-300">
    {label}
    <input
      aria-label={label}
      type={type}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-10 rounded border border-neutral-800 bg-neutral-950 px-3 text-sm disabled:opacity-50"
    />
  </label>
)

const ButtonAppearanceEditor = ({
  button,
  types,
  readOnly,
  onSave,
}: {
  readonly button: Button
  readonly types: string[]
  readonly readOnly: boolean
  readonly onSave: (button: Record<string, unknown>) => void
}) => {
  const initial = isButton(button) ? button : { type: button }
  const [value, setValue] = useState<Record<string, unknown>>(initial)
  useEffect(() => setValue(initial), [button])
  const set = (key: string, next: string): void =>
    setValue((current) => ({
      ...current,
      [key]: next.length === 0 ? undefined : next,
    }))
  const select = (key: string, next: string): void =>
    setValue((current) => ({
      ...current,
      [key]: next.length === 0 ? undefined : next,
    }))
  return (
    <div className="grid gap-3">
      <EditorField
        label="Label"
        value={fieldValue(value, "label")}
        disabled={readOnly}
        onChange={(next) => set("label", next)}
      />
      <label className="grid gap-1 text-sm text-neutral-300">
        Addon/action
        <select
          aria-label="Addon/action"
          value={fieldValue(value, "type")}
          disabled={readOnly}
          onChange={(event) => select("type", event.target.value)}
          className="min-h-10 rounded border border-neutral-800 bg-neutral-950 px-3"
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <EditorField
        label="Icon"
        value={fieldValue(value, "icon")}
        disabled={readOnly}
        onChange={(next) => set("icon", next)}
      />
      <EditorField
        label="Icon URL"
        value={fieldValue(value, "iconUrl")}
        type="url"
        disabled={readOnly}
        onChange={(next) => set("iconUrl", next)}
      />
      <label className="grid gap-1 text-sm text-neutral-300">
        Color
        <select
          aria-label="Color"
          value={fieldValue(value, "buttonColor")}
          disabled={readOnly}
          onChange={(event) => select("buttonColor", event.target.value)}
          className="min-h-10 rounded border border-neutral-800 bg-neutral-950 px-3"
        >
          <option value="">Default</option>
          {["blue", "green", "purple", "cyan", "magenta", "amber", "lime"].map(
            (color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ),
          )}
        </select>
      </label>
      <EditorField
        label="Size"
        value={fieldValue(value, "size")}
        disabled={readOnly}
        onChange={(next) => set("size", next)}
      />
      <EditorField
        label="Text size"
        value={fieldValue(value, "textSize")}
        disabled={readOnly}
        onChange={(next) => set("textSize", next)}
      />
      <EditorField
        label="Border radius"
        value={fieldValue(value, "borderRadius")}
        disabled={readOnly}
        onChange={(next) => set("borderRadius", next)}
      />
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onSave(value)}
        className="min-h-10 rounded bg-sky-600 px-3 text-sm disabled:opacity-50"
      >
        Save button
      </button>
      {readOnly && (
        <p className="text-xs text-amber-300">
          Generated buttons are owned by their addon.
        </p>
      )}
    </div>
  )
}

const DeckEditor = ({
  deck,
  theme,
  themeOptions,
  onSave,
  onTheme,
}: {
  readonly deck: Config["decks"] extends Record<string, infer T> ? T : never
  readonly theme: string
  readonly themeOptions: readonly ThemeOption[]
  readonly onSave: (deck: Record<string, unknown>) => void
  readonly onTheme: (theme: string) => void
}) => {
  const [value, setValue] = useState(() => ({
    label: deck.label ?? deck.name ?? "",
    columns: deck.columns === undefined ? "" : String(deck.columns),
    rows: deck.rows === undefined ? "" : String(deck.rows),
  }))
  useEffect(() => {
    setValue({
      label: deck.label ?? deck.name ?? "",
      columns: deck.columns === undefined ? "" : String(deck.columns),
      rows: deck.rows === undefined ? "" : String(deck.rows),
    })
  }, [deck])
  return (
    <div className="grid gap-3">
      <EditorField
        label="Label"
        value={value.label}
        onChange={(label) => setValue((current) => ({ ...current, label }))}
      />
      <EditorField
        label="Columns"
        type="number"
        value={value.columns}
        onChange={(columns) => setValue((current) => ({ ...current, columns }))}
      />
      <EditorField
        label="Rows"
        type="number"
        value={value.rows}
        onChange={(rows) => setValue((current) => ({ ...current, rows }))}
      />
      <label className="grid gap-1 text-sm text-neutral-300">
        Theme
        <select
          aria-label="Theme"
          value={theme}
          onChange={(event) => onTheme(event.target.value)}
          className="min-h-10 rounded border border-neutral-800 bg-neutral-950 px-3"
        >
          {(themeOptions.length === 0 ? [{ name: theme }] : themeOptions).map(
            (option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ),
          )}
        </select>
      </label>
      <button
        type="button"
        onClick={() =>
          onSave({
            ...deck,
            name: value.label || undefined,
            label: undefined,
            columns: value.columns === "" ? undefined : Number(value.columns),
            rows: value.rows === "" ? undefined : Number(value.rows),
          })
        }
        className="min-h-10 rounded bg-sky-600 px-3 text-sm"
      >
        Save deck
      </button>
    </div>
  )
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
  themes = [],
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

  useEffect(() => {
    wsClient?.send(JSON.stringify({ type: "editor-state-request" }))
  }, [wsClient])

  useEffect(() => {
    if (result === null) return
    setMessage(result.ok ? "Saved" : (result.error ?? "Edit failed"))
    if (result.requestId !== pendingRequestId) return
    if (result.ok) {
      if (newPage) setDeckId(newPageId.trim())
      setPendingButton(null)
      setPendingPosition(null)
      setNewPage(false)
      setPendingRequestId(null)
    }
  }, [newPage, newPageId, pendingRequestId, result])

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
  const [paletteTab, setPaletteTab] = useState<"buttons" | "decks" | "themes">(
    "buttons",
  )

  useEffect(() => {
    if (selectedPosition !== null) {
      const index = positions.indexOf(selectedPosition)
      if (index >= 0 && index !== selectedIndex) setSelectedIndex(index)
    }
    if (selectedIndex !== null && selectedIndex >= buttons.length) {
      setSelectedIndex(buttons.length === 0 ? null : buttons.length - 1)
    }
  }, [activeDeckId, selectedIndex, selectedPosition, state?.revision])

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
    setPendingPosition(position ?? null)
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
    sendMutation({
      kind: "update",
      deckId: activeDeckId,
      index: selectedIndex,
      button: { ...button, config },
    })
  }

  const saveButton = (button: Record<string, unknown>): void => {
    if (activeDeckId === null || selectedIndex === null) return
    sendMutation({
      kind: "update",
      deckId: activeDeckId,
      index: selectedIndex,
      button,
    })
  }

  const saveDeck = (deck: Record<string, unknown>): void => {
    if (activeDeckId === null) return
    sendMutation({ kind: "update-deck", deckId: activeDeckId, deck })
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
    const requestId = sendMutation({
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
        config: nextConfig,
        ...(position === undefined ? {} : { position }),
      },
    })
    setPendingRequestId(requestId)
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
    <section
      aria-labelledby="editor-title"
      className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-1"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <h1
            id="editor-title"
            className="text-xl font-semibold text-neutral-100"
          >
            Visual editor
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Arrange configured buttons and save valid YAML changes live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            role="status"
            aria-live="polite"
            className="text-xs text-neutral-400"
          >
            {message ??
              (state === null
                ? "Waiting for editor state…"
                : `Revision ${state.revision}`)}
          </span>
          <Button
            type="button"
            onClick={undo}
            isDisabled={!state?.canUndo}
            variant="tertiary"
          >
            Undo
          </Button>
        </div>
      </header>
      {state === null ? (
        <p className="text-sm text-neutral-400">Loading configured decks…</p>
      ) : (
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(12rem,16rem)_minmax(20rem,1fr)_minmax(18rem,1fr)]">
          <aside
            aria-label="Editor palette"
            className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="mb-3">
              <Tabs
                selectedKey={paletteTab}
                onSelectionChange={(key) =>
                  setPaletteTab(String(key) as typeof paletteTab)
                }
              >
                <Tabs.ListContainer>
                  <Tabs.List className="w-fit rounded-full bg-neutral-800 p-1">
                    <Tabs.Tab
                      id="buttons"
                      className="rounded-full px-3 py-1.5 text-xs"
                    >
                      Buttons
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab
                      id="decks"
                      className="rounded-full px-3 py-1.5 text-xs"
                    >
                      Decks
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab
                      id="themes"
                      className="rounded-full px-3 py-1.5 text-xs"
                    >
                      Themes
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
            </div>
            <div className="space-y-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                YAML sources
              </h2>
              {state.sources
                .filter((source) => /\.(?:yaml|yml)$/i.test(source))
                .map((source) => (
                  <div
                    key={source}
                    className="truncate rounded border border-neutral-800 px-3 py-2 font-mono text-xs text-neutral-400"
                    title={source}
                  >
                    {source}
                  </div>
                ))}
            </div>
            {paletteTab === "buttons" ? (
              <div role="tabpanel" aria-label="Buttons" className="space-y-3">
                <div className="space-y-1">
                  {addonInventory?.addons
                    .filter((addon) => !addon.internal)
                    .map((addon) => (
                      <div key={addon.name} className="space-y-1">
                        <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          {addon.name}
                        </h2>
                        {addon.buttonTypes
                          .filter((bt) => !bt.internal)
                          .map((bt) => (
                            <button
                              key={bt.type}
                              type="button"
                              draggable
                              onDragStart={(event) =>
                                dragStart(event, {
                                  kind: "palette",
                                  button: { type: bt.type, config: {} },
                                })
                              }
                              onClick={() =>
                                beginInsert({ type: bt.type, config: {} })
                              }
                              className="block min-h-10 w-full rounded border border-neutral-800 px-3 text-left text-sm text-emerald-300 hover:border-emerald-500"
                            >
                              {bt.type}
                            </button>
                          ))}
                      </div>
                    )) ?? (
                    <p className="text-xs text-neutral-500">
                      No addon types received.
                    </p>
                  )}
                </div>
              </div>
            ) : paletteTab === "decks" ? (
              <div role="tabpanel" aria-label="Decks" className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Configured decks
                </h2>
                <Button
                  type="button"
                  variant="secondary"
                  onPress={() => setCreatingDeck((value) => !value)}
                >
                  {creatingDeck ? "Cancel new deck" : "Create deck"}
                </Button>
                {creatingDeck && (
                  <div className="grid gap-2 rounded-lg border border-neutral-800 p-3">
                    <Input
                      aria-label="New deck ID"
                      label="ID"
                      value={newDeckId}
                      onChange={(event) => setNewDeckId(event.target.value)}
                    />
                    <Input
                      aria-label="New deck name"
                      label="Name"
                      value={newDeckName}
                      onChange={(event) => setNewDeckName(event.target.value)}
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
                      Save deck
                    </Button>
                  </div>
                )}
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
                    className="min-h-10 w-full rounded border border-neutral-800 px-3 text-left text-sm aria-pressed:border-sky-400 aria-pressed:bg-sky-500/15"
                  >
                    <span className="block truncate">{deck.name ?? id}</span>
                    <span className="block truncate text-xs text-neutral-500">
                      #{id}
                    </span>
                  </button>
                ))}
                {addonInventory?.addons
                  .filter((addon) => !addon.internal)
                  .map((addon) => (
                    <div key={addon.name} className="space-y-1">
                      <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        {addon.name}
                      </h2>
                      {addon.decks
                        .filter((deck) => !deck.internal)
                        .map((deck) => {
                          const button = {
                            type: "core:change-deck",
                            config: { deck: deck.id, label: deck.id },
                          }
                          return (
                            <div key={deck.id} className="flex gap-1">
                              <button
                                type="button"
                                draggable
                                onDragStart={(event) =>
                                  dragStart(event, { kind: "palette", button })
                                }
                                onClick={() =>
                                  insertAt(
                                    button,
                                    selectedPosition ?? buttons.length,
                                  )
                                }
                                className="min-h-10 min-w-0 flex-1 rounded border border-neutral-800 px-3 text-left text-sm text-amber-300 hover:border-amber-400"
                              >
                                {deck.id}
                              </button>
                              {deck.generated === true &&
                              deck.addonIndex !== undefined &&
                              deck.overrideKey !== undefined ? (
                                <button
                                  type="button"
                                  aria-label={`Edit override for ${deck.id}`}
                                  onClick={() => {
                                    sendMutation({
                                      kind: "set-addon-deck-override",
                                      addonIndex: deck.addonIndex,
                                      deckId: deck.overrideKey,
                                      override: {},
                                    })
                                    setMessage("Saving addon override…")
                                  }}
                                  className="min-h-10 rounded border border-neutral-800 px-2 text-xs text-sky-300 hover:border-sky-400"
                                >
                                  Edit
                                </button>
                              ) : null}
                            </div>
                          )
                        })}
                    </div>
                  ))}
              </div>
            ) : (
              <div role="tabpanel" aria-label="Themes" className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Configured theme
                </h2>
                <div className="space-y-1">
                  {themes.length === 0 ? (
                    <p className="rounded border border-neutral-800 px-3 py-3 font-mono text-sm text-amber-300">
                      {typeof config.theme === "string"
                        ? config.theme
                        : (config.theme?.src ?? "default")}
                    </p>
                  ) : (
                    themes.map((theme) => (
                      <button
                        key={theme.name}
                        type="button"
                        aria-pressed={theme.active === true}
                        onClick={() =>
                          sendMutation({ kind: "set-theme", theme: theme.name })
                        }
                        className="min-h-10 w-full rounded border border-neutral-800 px-3 text-left text-sm aria-pressed:border-sky-400 aria-pressed:bg-sky-500/15"
                      >
                        {theme.name}
                      </button>
                    ))
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  Theme changes are managed by the current YAML configuration.
                </p>
              </div>
            )}
          </aside>
          <section
            aria-labelledby="preview-title"
            className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <h2
              id="preview-title"
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              Live preview
            </h2>
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
                  onDropPosition={(position, event) => dropAt(event, position)}
                />
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Preview unavailable until the device is connected.
              </p>
            )}
          </section>
          <section
            aria-labelledby="deck-config-title"
            className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-2"
          >
            <h2
              id="deck-config-title"
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              Active deck
            </h2>
            {activeDeckId === null ? (
              <p className="text-sm text-neutral-500">No deck selected.</p>
            ) : deckDraft === null ? (
              <p className="text-sm text-neutral-500">
                Addon-provided decks are read-only here; edit their configured
                overrides in YAML.
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
                      setDeckDraft({ ...deckDraft, name: event.target.value })
                    }
                  />
                </p>
                <Input
                  aria-label="Deck icon"
                  label="Icon"
                  value={deckDraft.icon}
                  onChange={(event) =>
                    setDeckDraft({ ...deckDraft, icon: event.target.value })
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
                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={deckDraft.paginated}
                    onChange={(event) =>
                      setDeckDraft({
                        ...deckDraft,
                        paginated: event.target.checked,
                      })
                    }
                  />{" "}
                  Paginated
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={deckDraft.autoShow}
                    onChange={(event) =>
                      setDeckDraft({
                        ...deckDraft,
                        autoShow: event.target.checked,
                      })
                    }
                  />{" "}
                  Auto show overlay
                </label>
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
          </section>
          <section
            aria-labelledby="button-config-title"
            className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <h2
              id="button-config-title"
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              Selected button
            </h2>
            {selected !== undefined && (
              <div className="mb-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                <span className="rounded border border-neutral-800 px-2 py-1">
                  type: {isButton(selected) ? String(selected.type) : selected}
                </span>
                <span className="rounded border border-neutral-800 px-2 py-1">
                  position:{" "}
                  {selectedPosition === null ? "none" : selectedPosition + 1}
                </span>
              </div>
            )}
            {pendingButton !== null ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                  <p className="text-sm font-medium text-sky-200">Add button</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Choose a position, configure the button, then add it.
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-1 rounded-lg border border-neutral-800 p-3">
                  {Array.from(
                    { length: device?.keyCount ?? 15 },
                    (_, position) => {
                      const occupied = positions.includes(position)
                      return (
                        <button
                          key={position}
                          type="button"
                          aria-label={`Position ${position}${occupied ? " occupied" : " empty"}`}
                          aria-pressed={pendingPosition === position}
                          onClick={() => {
                            if (position === (device?.keyCount ?? 15) - 1) {
                              setPendingPosition(null)
                              setPositionUnset(true)
                            } else {
                              setPendingPosition(position)
                              setPositionUnset(false)
                            }
                            setNewPage(false)
                          }}
                          className={`h-[30px] w-[30px] rounded border text-xs ${positionUnset && position === (device?.keyCount ?? 15) - 1 ? "border-sky-400 bg-sky-500/20" : pendingPosition === position ? "border-sky-400 bg-sky-500/20" : occupied ? "border-amber-500/50 text-amber-300" : "border-neutral-800 text-neutral-500 hover:border-sky-400"}`}
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
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPosition(firstFreePosition())
                      setNewPage(false)
                    }}
                    className="rounded border border-neutral-700 px-3 py-2 text-xs hover:border-sky-400"
                  >
                    First available
                  </button>
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
                        onChange={(event) => setNewPageId(event.target.value)}
                        className="min-h-10 rounded border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100"
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-neutral-400">
                      Page name
                      <input
                        value={newPageName}
                        onChange={(event) => setNewPageName(event.target.value)}
                        className="min-h-10 rounded border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100"
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-neutral-400">
                      Icon source
                      <input
                        placeholder="icon://layout-grid"
                        value={newPageIcon}
                        onChange={(event) => setNewPageIcon(event.target.value)}
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
                <ButtonConfigEditor
                  key={`pending:${pendingButton.type as string}`}
                  wsClient={wsClient}
                  revision={state?.revision ?? 0}
                  buttonType={String(pendingButton.type ?? "")}
                  config={pendingButton.config ?? {}}
                  schema={
                    state?.buttonSchemas?.[String(pendingButton.type ?? "")]
                  }
                  validation={validation}
                  deckOptions={deckOptions}
                  saveLabel="Add button"
                  actionsInHeader
                  onCancel={() => setPendingButton(null)}
                  onSave={addPending}
                />
              </div>
            ) : selected === undefined ? (
              <div className="space-y-3">
                {activeDeck !== undefined && paletteTab !== "themes" && (
                  <DeckEditor
                    deck={activeDeck}
                    theme={
                      typeof config.theme === "string"
                        ? config.theme
                        : (config.theme?.src ?? "default")
                    }
                    themeOptions={themes}
                    onSave={saveDeck}
                    onTheme={(theme) =>
                      sendMutation({ kind: "set-theme", theme })
                    }
                  />
                )}
                <p className="text-sm text-neutral-500">
                  Select a preview position to edit its configuration.
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
                <ButtonAppearanceEditor
                  button={selected}
                  types={[
                    ...new Set([
                      ...(addonInventory?.addons.flatMap((addon) =>
                        addon.buttonTypes
                          .filter((type) => !type.internal)
                          .map((type) => type.type),
                      ) ?? []),
                      isButton(selected) && typeof selected.type === "string"
                        ? selected.type
                        : String(selected),
                    ]),
                  ]}
                  readOnly={selectedGenerated}
                  onSave={saveButton}
                />
                {!selectedGenerated && (
                  <ButtonConfigEditor
                    key={`${activeDeckId}:${selectedIndex}:${state?.revision ?? 0}`}
                    wsClient={wsClient}
                    revision={state?.revision ?? 0}
                    buttonType={
                      isButton(selected) && typeof selected.type === "string"
                        ? selected.type
                        : String(selected)
                    }
                    config={isButton(selected) ? selected.config : {}}
                    schema={
                      state?.buttonSchemas?.[
                        isButton(selected) && typeof selected.type === "string"
                          ? selected.type
                          : String(selected)
                      ]
                    }
                    validation={validation}
                    deckOptions={deckOptions}
                    actionsInHeader
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
        </div>
      )}
    </section>
  )
}
