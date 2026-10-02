import { useEffect, useState } from "react"

import { Button, Tabs, TextArea } from "@heroui/react"
import { Check, CircleX } from "lucide-react"
import { parse, stringify } from "yaml"

import type { WsClient } from "../bridge"
import { ConfigForm } from "./ButtonConfigEditor/ConfigForm"
import { setAt } from "./ButtonConfigEditor/utils"
import type { JsonSchema, ValidationState } from "./ButtonConfigEditor/types"
import type { PendingIconAsset } from "../components/IconPicker"

export type { JsonSchema, ValidationState } from "./ButtonConfigEditor/types"

export interface ButtonConfigEditorProps {
  readonly wsClient: WsClient | null
  readonly revision: number
  readonly buttonType: string
  readonly config: unknown
  readonly schema?: JsonSchema
  readonly validation: ValidationState | null
  readonly onSave: (config: Record<string, unknown>) => void
  readonly onCancel?: () => void
  readonly deckOptions?: readonly { id: string; name: string }[]
  readonly saveLabel?: string
  readonly actionsInHeader?: boolean
  readonly hideActions?: boolean
  readonly onDraftChange?: (config: Record<string, unknown> | null) => void
  readonly onPreviewChange?: (config: Record<string, unknown> | null) => void
  readonly onPendingAssetChange?: (
    path: string,
    asset: PendingIconAsset | null,
  ) => void
}

let validationNumber = 0

export const ButtonConfigEditor = ({
  wsClient,
  revision,
  buttonType,
  config,
  schema,
  validation,
  onSave,
  onCancel,
  deckOptions,
  saveLabel = "Save button config",
  actionsInHeader = false,
  hideActions = false,
  onDraftChange,
  onPreviewChange,
  onPendingAssetChange,
}: ButtonConfigEditorProps) => {
  const initial =
    typeof config === "object" && config !== null && !Array.isArray(config)
      ? config
      : {}
  const [value, setValue] = useState<unknown>(initial)
  const [yaml, setYaml] = useState(() => stringify(initial))
  const [yamlError, setYamlError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState("")

  useEffect(() => {
    setValue(initial)
    setYaml(stringify(initial))
    setYamlError(null)
  }, [config])

  useEffect(() => {
    if (wsClient === null) return
    const nextRequestId = `validation-${Date.now()}-${validationNumber++}`
    setRequestId(nextRequestId)
    wsClient.send(
      JSON.stringify({
        type: "editor-validation-request",
        requestId: nextRequestId,
        revision,
        buttonType,
        config: value,
      }),
    )
  }, [buttonType, revision, value, wsClient])

  const change = (path: string, next: unknown): void => {
    const nextValue = setAt(value, path, next)
    setValue(nextValue)
    setYaml(stringify(nextValue))
    setYamlError(null)
    setRequestId("")
  }

  const yamlChange = (next: string): void => {
    setYaml(next)
    setRequestId("")
    try {
      const parsed = parse(next)
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      )
        throw new Error("Config YAML must be an object")
      setValue(parsed)
      setYamlError(null)
    } catch (error) {
      setYamlError(error instanceof Error ? error.message : "Invalid YAML")
    }
  }

  const errors =
    yamlError !== null
      ? [yamlError]
      : validation?.requestId === requestId && !validation.valid
        ? validation.errors
        : []
  const canSave =
    yamlError === null &&
    validation?.requestId === requestId &&
    validation.valid === true &&
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)

  useEffect(() => {
    onDraftChange?.(canSave ? (value as Record<string, unknown>) : null)
  }, [canSave, onDraftChange, value])

  useEffect(() => {
    const previewConfig =
      yamlError === null &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null
    onPreviewChange?.(previewConfig)
  }, [onPreviewChange, value, yamlError])

  return (
    <div className="grid gap-3">
      {actionsInHeader && (
        <div className="flex justify-end gap-2">
          {onCancel !== undefined && (
            <Button type="button" variant="tertiary" onPress={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            isDisabled={!canSave}
            onPress={() => onSave(value as Record<string, unknown>)}
          >
            {saveLabel}
          </Button>
        </div>
      )}
      <Tabs aria-label="Button config editor" defaultSelectedKey="form">
        <Tabs.ListContainer>
          <Tabs.List>
            <Tabs.Tab id="form">
              Form
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="yaml">
              YAML
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="form">
          {schema === undefined ? (
            <p className="text-sm text-amber-300">
              No visual schema is available for this button type. Use YAML.
            </p>
          ) : (
            <ConfigForm
              schema={schema}
              value={value}
              path=""
              onChange={change}
              deckOptions={deckOptions}
              onPendingAssetChange={onPendingAssetChange}
            />
          )}
        </Tabs.Panel>
        <Tabs.Panel id="yaml">
          <TextArea
            aria-label="Button config YAML"
            value={yaml}
            onChange={(event) => yamlChange(event.target.value)}
            spellCheck={false}
            className="min-h-64 w-full resize-none font-mono text-sm"
          />
        </Tabs.Panel>
      </Tabs>
      {!actionsInHeader && !hideActions && (
        <div className="sticky bottom-0 flex gap-2 border-t border-separator bg-surface pt-3">
          {onCancel !== undefined && (
            <Button type="button" variant="tertiary" onPress={onCancel}>
              <CircleX aria-hidden="true" className="size-4" />
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            isDisabled={!canSave}
            onPress={() => onSave(value as Record<string, unknown>)}
          >
            <Check aria-hidden="true" className="size-4" />
            {saveLabel}
          </Button>
        </div>
      )}
      {errors.length > 0 && (
        <div role="alert" className="grid gap-1 text-sm text-danger">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
    </div>
  )
}
