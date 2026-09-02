import { useEffect, useState } from "react"

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
  decks?: Record<string, { name?: string; buttons?: Button[] }>
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

export const EditorPage = ({
  wsClient,
  state,
  result,
  addonInventory = null,
  frontendUrl,
  device,
  token,
  onGesture,
  themes = [],
  validation = null,
}: EditorPageProps) => {
  const [deckId, setDeckId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [clipboard, setClipboard] = useState<Button | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [sourcePath, setSourcePath] = useState<string | null>(null)
  const [sourceDraft, setSourceDraft] = useState("")

  useEffect(() => {
    wsClient?.send(JSON.stringify({ type: "editor-state-request" }))
  }, [wsClient])

  useEffect(() => {
    if (result !== null)
      setMessage(result.ok ? "Saved" : (result.error ?? "Edit failed"))
  }, [result])

  const config = (state?.config ?? {}) as Config
  const editableSources =
    state?.sources.filter((source) => /\.ya?ml$/i.test(source)) ?? []
  const decks = Object.entries(config.decks ?? {})
  const activeDeckId = deckId ?? decks[0]?.[0] ?? null
  const buttons =
    activeDeckId === null ? [] : (config.decks?.[activeDeckId]?.buttons ?? [])
  const positions = buttonPositions(buttons)
  const firstFreePosition = (): number => {
    const used = new Set(positions)
    for (let position = 0; position < (device?.keyCount ?? 15); position += 1) {
      if (!used.has(position)) return position
    }
    return positions.length
  }
  const selected = selectedIndex === null ? undefined : buttons[selectedIndex]
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

  const sendMutation = (mutation: Record<string, unknown>): void => {
    if (state === null) return
    wsClient?.send(
      JSON.stringify({
        type: "editor-mutate",
        requestId: nextRequestId(),
        revision: state.revision,
        mutation,
      }),
    )
    setMessage("Saving…")
  }

  const selectPosition = (position: number): void => {
    const index = buttons.findIndex((_, i) => positions[i] === position)
    setSelectedPosition(position)
    setSelectedIndex(index === -1 ? null : index)
  }

  const insertAt = (
    button: Record<string, unknown>,
    position: number,
  ): void => {
    if (activeDeckId === null) return
    const index = positions.indexOf(position)
    if (index >= 0 && !window.confirm(`Overwrite key ${position}?`)) return
    sendMutation({
      kind: index >= 0 ? "update" : "add",
      deckId: activeDeckId,
      ...(index >= 0 ? { index } : { index: buttons.length }),
      button: { ...button, position },
    })
    setSelectedPosition(position)
    setSelectedIndex(index >= 0 ? index : null)
  }

  const add = (index?: number): void => {
    if (activeDeckId === null) return
    const button =
      clipboard === null ? { type: "core:action", config: {} } : clipboard
    if (selectedPosition !== null)
      return insertAt(
        isButton(button) ? button : { type: button, config: {} },
        selectedPosition,
      )
    sendMutation({
      kind: "add",
      deckId: activeDeckId,
      index,
      button: {
        ...(isButton(button) ? button : { type: button }),
        position: firstFreePosition(),
      },
    })
  }

  const dropAt = (event: React.DragEvent, index: number): void => {
    event.preventDefault()
    if (activeDeckId === null) return
    const data = readDragData(event)
    if (data?.kind === "palette") {
      insertAt(data.button, index)
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
        sendMutation({ kind: "reorder", deckId: activeDeckId, from: index, to })
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
    if (sourcePath !== null)
      setSourceDraft(state?.sourceContents?.[sourcePath] ?? "")
  }, [sourcePath, state?.revision, state?.sourceContents])

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
          <button
            type="button"
            onClick={undo}
            disabled={!state?.canUndo}
            className="min-h-10 rounded border border-neutral-700 px-3 text-sm hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>
        </div>
      </header>
      {state === null ? (
        <p className="text-sm text-neutral-400">Loading configured decks…</p>
      ) : (
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(12rem,16rem)_minmax(20rem,1fr)_minmax(18rem,1fr)]">
          <aside aria-label="Editor palette" className="min-w-0">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Configured deck
            </h2>
            <select
              aria-label="Configured deck"
              value={activeDeckId ?? ""}
              onChange={(event) => {
                setDeckId(event.target.value)
                setSelectedIndex(null)
                setSelectedPosition(null)
              }}
              className="mb-3 min-h-10 w-full rounded border border-neutral-800 bg-neutral-950 px-3 text-sm"
            >
              {decks.map(([id, deck]) => (
                <option key={id} value={id}>
                  {deck.name ?? id}
                </option>
              ))}
            </select>
            <div
              className="mb-3 flex border-b border-neutral-800"
              role="tablist"
              aria-label="Palette categories"
            >
              {(
                [
                  ["buttons", "Buttons"],
                  ["decks", "Decks"],
                  ["themes", "Themes"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={paletteTab === id}
                  onClick={() => setPaletteTab(id)}
                  className="min-h-10 flex-1 border-b-2 px-2 text-xs font-semibold uppercase tracking-wider aria-selected:border-sky-400 aria-selected:text-sky-300"
                >
                  {label}
                </button>
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
                                insertAt(
                                  { type: bt.type, config: {} },
                                  selectedPosition ?? buttons.length,
                                )
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
                {decks.map(([id, deck]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setDeckId(id)
                      setSelectedIndex(null)
                      setSelectedPosition(null)
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
                            <button
                              key={deck.id}
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
                              className="min-h-10 w-full rounded border border-neutral-800 px-3 text-left text-sm text-amber-300 hover:border-amber-400"
                            >
                              {deck.id}
                            </button>
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
            <h2 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Included YAML
            </h2>
            <ul
              className="space-y-1 text-xs text-neutral-400"
              aria-label="Included YAML sources"
            >
              {editableSources.map((source) => (
                <li key={source} className="break-all">
                  <button
                    type="button"
                    onClick={() => setSourcePath(source)}
                    className="text-left hover:text-sky-300"
                  >
                    {source}
                  </button>
                </li>
              ))}
            </ul>
            {sourcePath !== null ? (
              <form
                className="mt-3 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  sendMutation({
                    kind: "edit-source",
                    path: sourcePath,
                    content: sourceDraft,
                  })
                }}
              >
                <label
                  htmlFor="source-yaml"
                  className="text-xs text-neutral-400"
                >
                  Edit included YAML
                </label>
                <textarea
                  id="source-yaml"
                  value={sourceDraft}
                  onChange={(event) => setSourceDraft(event.target.value)}
                  className="min-h-40 w-full rounded border border-neutral-700 bg-neutral-950 p-2 font-mono text-xs"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="min-h-10 rounded bg-emerald-700 px-3 text-sm"
                >
                  Save YAML
                </button>
              </form>
            ) : null}
          </aside>
          <section aria-labelledby="preview-title" className="min-w-0">
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
                  onSelectPosition={selectPosition}
                  onKeyAction={keyAction}
                  onGesture={onGesture}
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
          <section aria-labelledby="button-config-title" className="min-w-0">
            <h2
              id="button-config-title"
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              Selected button
            </h2>
            {selected === undefined ? (
              <div className="space-y-3">
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
                onSave={saveConfig}
              />
            )}
          </section>
        </div>
      )}
    </section>
  )
}
