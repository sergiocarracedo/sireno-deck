import { useEffect, useState } from "react"

import type { DeviceModelSpec } from "@sirenodeck/cli"

import type { WsClient } from "../bridge"
import { DeckFrame } from "../DeckFrame"
import type { AddonInventory } from "./AddonsPage"

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
  readonly themes?: readonly ThemeOption[]
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

export const EditorPage = ({
  wsClient,
  state,
  result,
  addonInventory = null,
  frontendUrl,
  device,
  token,
  themes = [],
}: EditorPageProps) => {
  const [deckId, setDeckId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState("")
  const [clipboard, setClipboard] = useState<Button | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [sourcePath, setSourcePath] = useState<string | null>(null)
  const [sourceDraft, setSourceDraft] = useState("")
  const [addonDeck, setAddonDeck] = useState<{
    addonIndex: number
    deckId: string
  } | null>(null)
  const [addonDeckDraft, setAddonDeckDraft] = useState("{}")

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
  const selected = selectedIndex === null ? undefined : buttons[selectedIndex]
  const [paletteTab, setPaletteTab] = useState<"addons" | "themes">("addons")

  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= buttons.length) {
      setSelectedIndex(buttons.length === 0 ? null : buttons.length - 1)
    }
    if (selected !== undefined) {
      setDraft(
        JSON.stringify(
          isButton(selected) ? selected : { type: selected },
          null,
          2,
        ),
      )
    }
  }, [activeDeckId, selectedIndex, state?.revision])

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

  const add = (index?: number): void => {
    if (activeDeckId === null) return
    const button =
      clipboard === null ? { type: "core:action", config: {} } : clipboard
    sendMutation({ kind: "add", deckId: activeDeckId, index, button })
  }

  const dropAt = (event: React.DragEvent, index: number): void => {
    event.preventDefault()
    if (activeDeckId === null) return
    const data = readDragData(event)
    if (data?.kind === "palette") {
      sendMutation({
        kind: "add",
        deckId: activeDeckId,
        index,
        button: data.button,
      })
    } else if (data?.kind === "existing" && data.index !== index) {
      sendMutation({
        kind: "reorder",
        deckId: activeDeckId,
        from: data.index,
        to: index,
      })
    }
  }

  const dragStart = (event: React.DragEvent, data: DragData): void => {
    event.dataTransfer.effectAllowed = "copyMove"
    event.dataTransfer.setData("application/json", JSON.stringify(data))
  }

  const update = (): void => {
    if (activeDeckId === null || selectedIndex === null) return
    try {
      const parsed = JSON.parse(draft) as unknown
      if (!isButton(parsed) || typeof parsed.type !== "string")
        throw new Error("Button JSON needs a string type")
      sendMutation({
        kind: "update",
        deckId: activeDeckId,
        index: selectedIndex,
        button: parsed,
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid JSON")
    }
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
    if (addonDeck !== null) setAddonDeckDraft("{}")
  }, [addonDeck])

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
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(12rem,16rem)_minmax(18rem,1fr)_minmax(16rem,1fr)_minmax(18rem,1fr)]">
          <aside aria-label="Editor palette" className="min-w-0">
            <div
              className="mb-3 flex border-b border-neutral-800"
              role="tablist"
              aria-label="Palette categories"
            >
              {(
                [
                  ["addons", "Addons"],
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
            {paletteTab === "addons" ? (
              <div
                role="tabpanel"
                aria-label="Addon buttons and decks"
                className="space-y-3"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Button types
                </h2>
                <div className="space-y-1">
                  {addonInventory?.addons.flatMap((addon) =>
                    addon.buttonTypes
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
                          onClick={() => add()}
                          className="block min-h-10 w-full rounded border border-neutral-800 px-3 text-left text-sm text-emerald-300 hover:border-emerald-500"
                        >
                          {bt.type}
                        </button>
                      )),
                  ) ?? (
                    <p className="text-xs text-neutral-500">
                      No addon types received.
                    </p>
                  )}
                </div>
                <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Decks
                </h2>
                <div className="space-y-1">
                  {decks.map(([id, deck]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setDeckId(id)
                        setSelectedIndex(null)
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
                </div>
                <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Addon decks
                </h2>
                <div className="space-y-1">
                  {addonInventory?.addons.flatMap((addon, addonIndex) =>
                    addon.decks
                      .filter((deck) => !deck.internal)
                      .map((deck) => (
                        <button
                          key={`${addonIndex}:${deck.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedIndex(null)
                            setAddonDeck({ addonIndex, deckId: deck.id })
                          }}
                          className="min-h-10 w-full rounded border border-neutral-800 px-3 text-left text-sm hover:border-amber-400"
                        >
                          <span className="block truncate">{deck.id}</span>
                          <span className="block truncate text-xs text-neutral-500">
                            {addon.name}
                          </span>
                        </button>
                      )),
                  )}
                </div>
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
          <section aria-labelledby="buttons-title" className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2
                id="buttons-title"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-500"
              >
                {activeDeckId ?? "No deck"} buttons
              </h2>
              <button
                type="button"
                onClick={() => add()}
                disabled={activeDeckId === null}
                className="min-h-10 rounded bg-sky-600 px-3 text-sm hover:bg-sky-500 disabled:opacity-40"
              >
                {clipboard === null ? "Add button" : "Paste button"}
              </button>
            </div>
            <ol className="space-y-2" aria-label="Buttons in order">
              {buttons.map((button, index) => {
                const label =
                  isButton(button) && typeof button.type === "string"
                    ? button.type
                    : String(button)
                return (
                  <li
                    key={`${index}-${label}`}
                    draggable
                    onDragStart={(event) =>
                      dragStart(event, { kind: "existing", index })
                    }
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropAt(event, index)}
                    className={`flex items-center gap-2 rounded border p-2 ${selectedIndex === index ? "border-sky-400 bg-sky-500/10" : "border-neutral-800"}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAddonDeck(null)
                        setSelectedIndex(index)
                      }}
                      aria-label={`Edit button ${index + 1}, ${label}`}
                      className="min-h-10 min-w-0 flex-1 truncate text-left text-sm"
                    >
                      {index + 1}. {label}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        index > 0 &&
                        activeDeckId !== null &&
                        sendMutation({
                          kind: "reorder",
                          deckId: activeDeckId,
                          from: index,
                          to: index - 1,
                        })
                      }
                      disabled={index === 0}
                      aria-label={`Move ${label} up`}
                      className="min-h-10 min-w-10 rounded border border-neutral-700 text-lg disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        index < buttons.length - 1 &&
                        activeDeckId !== null &&
                        sendMutation({
                          kind: "reorder",
                          deckId: activeDeckId,
                          from: index,
                          to: index + 1,
                        })
                      }
                      disabled={index === buttons.length - 1}
                      aria-label={`Move ${label} down`}
                      className="min-h-10 min-w-10 rounded border border-neutral-700 text-lg disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClipboard(button)
                        setMessage("Copied")
                      }}
                      aria-label={`Copy ${label}`}
                      className="min-h-10 min-w-10 rounded border border-neutral-700 text-xs"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        activeDeckId !== null &&
                        sendMutation({
                          kind: "add",
                          deckId: activeDeckId,
                          index: index + 1,
                          button,
                        })
                      }
                      aria-label={`Duplicate ${label}`}
                      className="min-h-10 rounded border border-neutral-700 px-2 text-xs"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        activeDeckId !== null &&
                        sendMutation({
                          kind: "delete",
                          deckId: activeDeckId,
                          index,
                        })
                      }
                      aria-label={`Delete ${label}`}
                      className="min-h-10 min-w-10 rounded border border-red-900 px-2 text-xs text-red-300 hover:bg-red-950"
                    >
                      Delete
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
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
                onDrop={(event) => dropAt(event, buttons.length)}
                className="overflow-auto rounded-xl"
              >
                <DeckFrame
                  frontendUrl={frontendUrl}
                  device={device}
                  deckId={activeDeckId}
                  token={token}
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
              addonDeck === null ? (
                <p className="text-sm text-neutral-500">
                  Select a button or addon deck to edit its configuration.
                </p>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    try {
                      const override = JSON.parse(addonDeckDraft) as unknown
                      if (
                        typeof override !== "object" ||
                        override === null ||
                        Array.isArray(override)
                      )
                        throw new Error("Override JSON must be an object")
                      sendMutation({
                        kind: "set-addon-deck-override",
                        ...addonDeck,
                        override,
                      })
                    } catch (error) {
                      setMessage(
                        error instanceof Error ? error.message : "Invalid JSON",
                      )
                    }
                  }}
                  className="space-y-3"
                >
                  <p className="text-sm text-amber-300">
                    {addonDeck.deckId} override
                  </p>
                  <textarea
                    aria-label="Addon deck override JSON"
                    value={addonDeckDraft}
                    onChange={(event) => setAddonDeckDraft(event.target.value)}
                    className="min-h-64 w-full rounded border border-neutral-700 bg-neutral-950 p-3 font-mono text-sm"
                    spellCheck={false}
                  />
                  <button
                    type="submit"
                    className="min-h-10 rounded bg-emerald-700 px-3 text-sm"
                  >
                    Save override
                  </button>
                </form>
              )
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  update()
                }}
                className="space-y-3"
              >
                <label
                  htmlFor="button-json"
                  className="block text-sm text-neutral-300"
                >
                  Button JSON
                </label>
                <textarea
                  id="button-json"
                  name="button-json"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  spellCheck={false}
                  className="min-h-64 w-full resize-y rounded border border-neutral-700 bg-neutral-950 p-3 font-mono text-sm text-neutral-100 focus-visible:outline-2 focus-visible:outline-sky-400"
                  aria-describedby="button-json-help"
                />
                <p id="button-json-help" className="text-xs text-neutral-500">
                  The server validates this definition before writing.
                </p>
                <button
                  type="submit"
                  className="min-h-10 rounded bg-emerald-700 px-3 text-sm hover:bg-emerald-600"
                >
                  Save button
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
