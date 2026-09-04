import { useEffect, useState } from "react"
import { Button, Tabs } from "@heroui/react"

import type { WsClient } from "../bridge"
import type { EditorState } from "./EditorPage"

export interface ConfigPageProps {
  readonly configPath?: string | null
  readonly editor?: React.ReactNode
  readonly wsClient?: WsClient | null
  readonly editorState?: EditorState | null
  readonly sourceValidation?: {
    readonly requestId: string
    readonly valid: boolean
    readonly errors: string[]
  } | null
  readonly mutationResult?: {
    readonly requestId: string
    readonly ok: boolean
    readonly error?: string
  } | null
}

let sourceRequestNumber = 0
const nextSourceRequestId = (): string =>
  `source-${Date.now()}-${sourceRequestNumber++}`

export const ConfigPage = ({
  configPath,
  editor,
  wsClient = null,
  editorState = null,
  sourceValidation = null,
  mutationResult = null,
}: ConfigPageProps) => {
  const [tab, setTab] = useState<"editor" | "config">(
    editor === undefined ? "config" : "editor",
  )
  const sources = editorState?.sources ?? []
  const [selectedSource, setSelectedSource] = useState<string | null>(
    sources[0] ?? configPath ?? null,
  )
  const [draft, setDraft] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [saveRequestId, setSaveRequestId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedSource === null && sources[0] !== undefined) {
      setSelectedSource(sources[0])
      return
    }
    if (selectedSource === null) return
    setDraft(editorState?.sourceContents?.[selectedSource] ?? "")
    setRequestId(null)
    setSaveRequestId(null)
  }, [editorState?.revision, selectedSource])

  useEffect(() => {
    if (mutationResult?.requestId !== saveRequestId) return
    if (mutationResult.ok) setSaveRequestId(null)
  }, [mutationResult, saveRequestId])

  const original =
    selectedSource === null
      ? ""
      : (editorState?.sourceContents?.[selectedSource] ?? "")
  const isDirty = draft !== null && draft !== original
  const validationMatches =
    requestId !== null && sourceValidation?.requestId === requestId
  const canSave =
    isDirty && validationMatches && sourceValidation?.valid === true

  const changeDraft = (content: string): void => {
    setDraft(content)
    const nextRequestId = nextSourceRequestId()
    setRequestId(nextRequestId)
    wsClient?.send(
      JSON.stringify({
        type: "editor-source-validation-request",
        requestId: nextRequestId,
        revision: editorState?.revision ?? 0,
        path: selectedSource,
        content,
      }),
    )
  }

  const save = (): void => {
    if (!canSave || selectedSource === null || draft === null) return
    const nextRequestId = nextSourceRequestId()
    setSaveRequestId(nextRequestId)
    wsClient?.send(
      JSON.stringify({
        type: "editor-mutate",
        requestId: nextRequestId,
        revision: editorState?.revision ?? 0,
        mutation: { kind: "edit-source", path: selectedSource, content: draft },
      }),
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => setTab(String(key) as "editor" | "config")}
        className="min-h-0 flex-1"
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label="Configuration views"
            className="w-fit rounded-full bg-[var(--surface-secondary)] p-1"
          >
            {editor !== undefined && (
              <Tabs.Tab
                id="editor"
                className="rounded-full px-4 py-1.5 text-xs"
              >
                Editor
                <Tabs.Indicator />
              </Tabs.Tab>
            )}
            <Tabs.Tab id="config" className="rounded-full px-4 py-1.5 text-xs">
              Config
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        {editor !== undefined && (
          <Tabs.Panel
            id="editor"
            className="min-h-0 flex-1 overflow-hidden p-4"
          >
            {editor}
          </Tabs.Panel>
        )}
        <Tabs.Panel id="config" className="min-h-0 flex-1 overflow-hidden p-4">
          <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row">
            <aside className="w-full shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 lg:w-64">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Configuration files
              </h2>
              <div className="grid gap-1">
                {sources.map((source, index) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setSelectedSource(source)}
                    aria-pressed={selectedSource === source}
                    className="rounded-lg px-3 py-2 text-left text-xs aria-pressed:bg-[var(--default)] aria-pressed:text-[var(--foreground)]"
                  >
                    <span className="block truncate font-mono">{source}</span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {index === 0 ? "Main config" : "Included file"}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
            <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">
                    {selectedSource ?? "Configuration"}
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    The complete configuration must validate before saving.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="tertiary"
                    onPress={() => setDraft(original)}
                    isDisabled={!isDirty}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onPress={save}
                    isDisabled={!canSave || saveRequestId !== null}
                  >
                    {saveRequestId === null ? "Save" : "Saving..."}
                  </Button>
                </div>
              </header>
              <textarea
                aria-label="Configuration source YAML"
                value={draft ?? ""}
                onChange={(event) => changeDraft(event.target.value)}
                spellCheck={false}
                className="min-h-0 w-full flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 font-mono text-sm text-[var(--foreground)] outline-none focus:border-[var(--focus)]"
              />
              {validationMatches && sourceValidation?.errors.length !== 0 && (
                <div
                  role="alert"
                  className="mt-3 grid gap-1 text-sm text-[var(--danger)]"
                >
                  {sourceValidation?.errors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}
            </section>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
