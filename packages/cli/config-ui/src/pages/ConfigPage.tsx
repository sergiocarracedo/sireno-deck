import { useEffect, useState } from "react"
import { Button, Card, ListBox, Select, Tabs, TextArea } from "@heroui/react"
import { CodeXml, PencilRuler } from "lucide-react"

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
  readonly activeTab?: "editor" | "config"
  readonly onTabChange?: (tab: "editor" | "config") => void
  readonly revision?: number | null
  readonly canUndo?: boolean
  readonly onUndo?: () => void
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
  activeTab,
  onTabChange,
  revision = null,
  canUndo = false,
  onUndo,
}: ConfigPageProps) => {
  const [internalTab, setInternalTab] = useState<"editor" | "config">(
    editor === undefined ? "config" : "editor",
  )
  const tab = activeTab ?? internalTab
  const sources = editorState?.sources ?? []
  const [selectedSource, setSelectedSource] = useState<string | null>(
    sources[0] ?? configPath ?? null,
  )
  const [draft, setDraft] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [saveRequestId, setSaveRequestId] = useState<string | null>(null)
  const [themeRequestId, setThemeRequestId] = useState<string | null>(null)
  const [themeMessage, setThemeMessage] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

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

  useEffect(() => {
    if (mutationResult?.requestId !== themeRequestId) return
    setThemeMessage(
      mutationResult.ok
        ? "Theme saved"
        : (mutationResult.error ?? "Theme update failed"),
    )
    if (!mutationResult.ok) setSelectedTheme(null)
    setThemeRequestId(null)
  }, [mutationResult, themeRequestId])

  const original =
    selectedSource === null
      ? ""
      : (editorState?.sourceContents?.[selectedSource] ?? "")
  const isDirty = draft !== null && draft !== original
  const validationMatches =
    requestId !== null && sourceValidation?.requestId === requestId
  const canSave =
    isDirty && validationMatches && sourceValidation?.valid === true
  const theme = (
    editorState?.config as { theme?: string | { src?: string } } | undefined
  )?.theme
  const activeTheme =
    typeof theme === "string" ? theme : (theme?.src ?? "default")

  useEffect(() => {
    if (selectedTheme === activeTheme) setSelectedTheme(null)
  }, [activeTheme, selectedTheme])

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
        onSelectionChange={(key) => {
          const next = String(key) as "editor" | "config"
          setInternalTab(next)
          onTabChange?.(next)
        }}
        className="min-h-0 flex-1"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <Tabs.ListContainer>
            <Tabs.List
              aria-label="Configuration views"
              className="w-fit rounded-full bg-[var(--surface-secondary)] p-1"
            >
              {editor !== undefined && (
                <Tabs.Tab
                  id="editor"
                  className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs"
                >
                  <PencilRuler size={14} aria-hidden="true" />
                  Editor
                  <Tabs.Indicator />
                </Tabs.Tab>
              )}
              <Tabs.Tab
                id="config"
                className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs"
              >
                <CodeXml size={14} aria-hidden="true" />
                Config
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <div className="flex items-center gap-2">
            <span
              role="status"
              aria-live="polite"
              className="text-sm text-muted"
            >
              {revision === null
                ? "Waiting for editor state"
                : `Revision ${revision}`}
            </span>
            <Button
              type="button"
              variant="tertiary"
              isDisabled={!canUndo}
              onPress={onUndo}
            >
              Undo
            </Button>
            <span className="text-sm text-muted">Theme</span>
            <Select
              aria-label="Theme"
              selectedKey={selectedTheme ?? activeTheme}
              onSelectionChange={(key) => {
                const themeName = String(key)
                const nextRequestId = nextSourceRequestId()
                setSelectedTheme(themeName)
                setThemeRequestId(nextRequestId)
                setThemeMessage("Saving theme...")
                wsClient?.send(
                  JSON.stringify({
                    type: "editor-mutate",
                    requestId: nextRequestId,
                    revision: editorState?.revision ?? 0,
                    mutation: { kind: "set-theme", theme: themeName },
                  }),
                )
              }}
            >
              <Select.Trigger className="min-w-32">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(editorState?.themes?.length === 0
                    ? [{ name: activeTheme }]
                    : (editorState?.themes ?? [{ name: activeTheme }])
                  ).map((theme) => (
                    <ListBox.Item
                      key={theme.name}
                      id={theme.name}
                      textValue={theme.name}
                    >
                      {theme.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            {themeMessage !== null && (
              <span role="status" aria-live="polite" className="sr-only">
                {themeMessage}
              </span>
            )}
          </div>
        </div>
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
            <Card className="w-full shrink-0 lg:w-64">
              <Card.Header>
                <Card.Title>Configuration files</Card.Title>
              </Card.Header>
              <Card.Content className="grid gap-1">
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
              </Card.Content>
            </Card>
            <Card className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-3">
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
              </Card.Header>
              <Card.Content className="flex min-h-0 flex-1 flex-col">
                <TextArea
                  aria-label="Configuration source YAML"
                  value={draft ?? ""}
                  onChange={(event) => changeDraft(event.target.value)}
                  spellCheck={false}
                  className="min-h-0 w-full flex-1 font-mono"
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
              </Card.Content>
            </Card>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
