import { useEffect, useState } from "react"

import { Button, Input, ListBox, Select, Tabs, TextArea } from "@heroui/react"
import { parse, stringify } from "yaml"
import { Icon } from "@sirenodeck/cli"
import * as lucideIcons from "lucide-react"

import type { WsClient } from "../bridge"

export interface JsonSchema {
  readonly type?: string
  readonly title?: string
  readonly description?: string
  readonly default?: unknown
  readonly const?: unknown
  readonly enum?: unknown[]
  readonly properties?: Record<string, JsonSchema>
  readonly required?: string[]
  readonly items?: JsonSchema
  readonly minItems?: number
  readonly maxItems?: number
  readonly oneOf?: JsonSchema[]
  readonly anyOf?: JsonSchema[]
  readonly internal?: boolean
}

export interface ValidationState {
  readonly requestId: string
  readonly valid: boolean
  readonly errors: string[]
}

interface ConfigFormProps {
  readonly schema: JsonSchema
  readonly value: unknown
  readonly path: string
  readonly onChange: (path: string, value: unknown) => void
  readonly wsClient: WsClient | null
  readonly revision: number
  readonly deckOptions?: readonly { id: string; name: string }[]
}

const LUCIDE_ICONS = Object.keys(lucideIcons)
  .filter(
    (name) =>
      /^[A-Z]/.test(name) &&
      name !== "createLucideIcon" &&
      !name.endsWith("Icon") &&
      !name.endsWith("Provider"),
  )
  .map((name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase())
  .filter((name, index, names) => names.indexOf(name) === index)
  .sort()

const isIconField = (key: string, schema: JsonSchema): boolean =>
  key.toLowerCase() === "icon" ||
  schema.description?.toLowerCase().includes("icon://") === true

const IconField = ({
  value,
  onChange,
  wsClient,
  revision,
}: {
  readonly value: unknown
  readonly onChange: (value: string) => void
  readonly wsClient: WsClient | null
  readonly revision: number
}) => {
  const current = typeof value === "string" ? value : ""
  const selected = current.startsWith("icon://") ? current.slice(7) : ""
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const filtered = LUCIDE_ICONS.filter((name) =>
    name.includes(query.trim().toLowerCase()),
  ).slice(0, query.trim() === "" ? 120 : 240)
  return (
    <fieldset className="grid gap-2 rounded-lg border border-neutral-800 p-3">
      <legend className="px-1 text-sm text-neutral-300">Icon</legend>
      <Button type="button" variant="secondary" onPress={() => setOpen(true)}>
        {selected === "" ? (
          "Choose icon"
        ) : (
          <>
            <Icon source={`icon://${selected}`} size={16} /> {selected}
          </>
        )}
      </Button>
      {open && (
        <dialog
          open
          aria-label="Choose icon"
          className="fixed inset-0 z-50 m-auto max-h-[80vh] w-[min(42rem,calc(100vw-2rem))] rounded-xl border border-neutral-700 bg-neutral-950 p-4 text-neutral-100 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Choose a Lucide icon</h3>
            <Button
              type="button"
              variant="tertiary"
              onPress={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
          <Input
            aria-label="Search icons"
            placeholder="Search by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-3 grid max-h-[55vh] grid-cols-6 gap-1 overflow-auto sm:grid-cols-8">
            {filtered.map((name) => (
              <Button
                key={name}
                type="button"
                size="sm"
                variant={selected === name ? "secondary" : "tertiary"}
                aria-label={name}
                className="h-12 min-w-0 flex-col gap-0 p-1 text-[9px]"
                onPress={() => {
                  onChange(`icon://${name}`)
                  setOpen(false)
                }}
              >
                <Icon source={`icon://${name}`} size={18} />
                <span className="max-w-full truncate">{name}</span>
              </Button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-neutral-500">
              No icons found.
            </p>
          )}
        </dialog>
      )}
      {selected !== "" && (
        <Button type="button" variant="tertiary" onPress={() => onChange("")}>
          Clear icon
        </Button>
      )}
      <Input
        aria-label="Image path"
        label="Image path"
        placeholder="./assets/icon.png"
        value={current.startsWith("icon://") ? "" : current}
        onChange={(event) => onChange(event.target.value)}
      />
      <label className="grid gap-1 text-xs text-neutral-500">
        Choose an image file
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file === undefined) return
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = String(reader.result)
              const data = dataUrl.split(",", 2)[1]
              if (data === undefined || wsClient === null) return
              wsClient.send(
                JSON.stringify({
                  type: "editor-asset-write",
                  requestId: `asset-${Date.now()}-${validationNumber++}`,
                  revision,
                  filename: safeName,
                  data,
                }),
              )
              onChange(`./assets/${safeName}`)
            }
            reader.readAsDataURL(file)
          }}
          className="text-xs text-neutral-400 file:mr-2 file:rounded file:border-0 file:bg-neutral-800 file:px-2 file:py-1 file:text-xs file:text-neutral-200"
        />
      </label>
    </fieldset>
  )
}

const labelFor = (key: string): string =>
  key
    .replaceAll(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const valueAt = (value: unknown, path: string): unknown => {
  let current = value
  for (const segment of path.split(".").filter(Boolean)) {
    if (typeof current !== "object" || current === null) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

const setAt = (value: unknown, path: string, next: unknown): unknown => {
  const segments = path.split(".").filter(Boolean)
  if (segments.length === 0) return next
  const root =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {}
  let current = root
  for (const segment of segments.slice(0, -1)) {
    const child = current[segment]
    current[segment] =
      typeof child === "object" && child !== null && !Array.isArray(child)
        ? { ...(child as Record<string, unknown>) }
        : {}
    current = current[segment] as Record<string, unknown>
  }
  current[segments.at(-1)!] = next
  return root
}

const defaultValue = (schema: JsonSchema): unknown => {
  if (schema.default !== undefined) return schema.default
  if (schema.const !== undefined) return schema.const
  if (schema.enum?.[0] !== undefined) return schema.enum[0]
  if (schema.type === "object") {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {})
        .filter(([, child]) => child.internal !== true)
        .filter(([key]) => schema.required?.includes(key))
        .map(([key, child]) => [key, defaultValue(child)]),
    )
  }
  if (schema.type === "array") return []
  if (schema.type === "boolean") return false
  if (schema.type === "number" || schema.type === "integer") return 0
  return ""
}

const ConfigForm = ({
  schema,
  value,
  path,
  onChange,
  wsClient,
  revision,
  deckOptions,
}: ConfigFormProps) => {
  const variants = schema.oneOf ?? schema.anyOf
  if (variants !== undefined && variants.length > 0) {
    const currentType =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>).type
        : undefined
    const selectedIndex = Math.max(
      0,
      variants.findIndex(
        (variant) =>
          variant.properties?.type?.enum?.includes(currentType) ||
          variant.properties?.type?.const === currentType,
      ),
    )
    const selectedSchema = variants[selectedIndex] ?? variants[0]!
    return (
      <div className="grid gap-2">
        <Select
          selectedKey={String(selectedIndex)}
          aria-label={`${labelFor(path.split(".").at(-1) ?? "Value")} type`}
          onSelectionChange={(key) => {
            const nextSchema = variants[Number(key)] ?? selectedSchema
            onChange(path, defaultValue(nextSchema))
          }}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {variants.map((variant, index) => (
                <ListBox.Item
                  key={index}
                  id={String(index)}
                  textValue={String(variant.title ?? `Option ${index + 1}`)}
                >
                  {String(variant.title ?? `Option ${index + 1}`)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <ConfigForm
          schema={selectedSchema}
          value={value}
          path={path}
          onChange={onChange}
          wsClient={wsClient}
          revision={revision}
          deckOptions={deckOptions}
        />
      </div>
    )
  }
  const selectedSchema = schema
  if (selectedSchema.enum !== undefined) {
    return (
      <Select
        selectedKey={JSON.stringify(value)}
        onSelectionChange={(key) => onChange(path, JSON.parse(String(key)))}
        aria-label={labelFor(path.split(".").at(-1) ?? "Value")}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {selectedSchema.enum.map((option) => (
              <ListBox.Item
                key={JSON.stringify(option)}
                id={JSON.stringify(option)}
                textValue={String(option)}
              >
                {String(option)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    )
  }
  if (path.split(".").at(-1) === "deck" && deckOptions !== undefined) {
    return (
      <Select
        selectedKey={typeof value === "string" ? value : ""}
        onSelectionChange={(key) => onChange(path, String(key))}
        aria-label="Target deck"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {deckOptions.map((deck) => (
              <ListBox.Item
                key={deck.id}
                id={deck.id}
                textValue={`${deck.name} ${deck.id}`}
              >
                {deck.name}{" "}
                <span className="text-xs text-neutral-500">#{deck.id}</span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    )
  }
  if (selectedSchema.type === "object" || selectedSchema.properties) {
    return (
      <div className="grid gap-3 border-l border-neutral-800 pl-3">
        {Object.entries(selectedSchema.properties ?? {})
          .filter(([, child]) => child.internal !== true)
          .map(([key, child]) =>
            isIconField(key, child) ? (
              <IconField
                key={key}
                value={valueAt(value, key)}
                onChange={(next) => onChange(`${path}.${key}`, next)}
                wsClient={wsClient}
                revision={revision}
                deckOptions={deckOptions}
              />
            ) : (
              <ConfigForm
                key={key}
                schema={child}
                value={valueAt(value, key)}
                path={`${path}.${key}`}
                onChange={onChange}
                wsClient={wsClient}
                revision={revision}
                deckOptions={deckOptions}
              />
            ),
          )}
        {Object.entries(selectedSchema.properties ?? {}).filter(
          ([, child]) => child.internal !== true,
        ).length === 0 && (
          <p className="text-xs text-neutral-500">This config has no fields.</p>
        )}
      </div>
    )
  }
  if (selectedSchema.type === "array") {
    const items = Array.isArray(value) ? value : []
    return (
      <fieldset className="grid gap-2 rounded-lg border border-neutral-800 p-3">
        <legend className="px-1 text-sm text-neutral-300">
          {labelFor(path.split(".").at(-1) ?? "Items")}
        </legend>
        {items.map((item, index) => (
          <div key={`${path}-${index}`} className="flex gap-2">
            <div className="min-w-0 flex-1">
              <ConfigForm
                schema={selectedSchema.items ?? { type: "string" }}
                value={item}
                path={`${path}.${index}`}
                onChange={onChange}
                wsClient={wsClient}
                revision={revision}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="tertiary"
              aria-label={`Delete item ${index + 1}`}
              onPress={() =>
                onChange(
                  path,
                  items.filter((_, i) => i !== index),
                )
              }
            >
              Trash
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          isDisabled={
            selectedSchema.maxItems !== undefined &&
            items.length >= selectedSchema.maxItems
          }
          onPress={() =>
            onChange(path, [...items, defaultValue(selectedSchema.items ?? {})])
          }
        >
          + Add item
        </Button>
      </fieldset>
    )
  }
  const inputType =
    selectedSchema.type === "number" || selectedSchema.type === "integer"
      ? "number"
      : "text"
  const inputValue =
    selectedSchema.type === "boolean"
      ? value === true
        ? "true"
        : "false"
      : String(value ?? "")
  return (
    <label className="grid gap-1 text-sm text-neutral-300">
      {labelFor(path.split(".").at(-1) ?? "Value")}
      <Input
        type={inputType}
        value={inputValue}
        onChange={(event) => {
          const raw = event.target.value
          onChange(
            path,
            selectedSchema.type === "boolean"
              ? raw === "true"
              : inputType === "number"
                ? Number(raw)
                : raw,
          )
        }}
      />
    </label>
  )
}

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
              wsClient={wsClient}
              revision={revision}
              deckOptions={deckOptions}
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
      {!actionsInHeader && (
        <Button
          type="button"
          variant="primary"
          isDisabled={!canSave}
          onPress={() => onSave(value as Record<string, unknown>)}
        >
          {saveLabel}
        </Button>
      )}
      {!actionsInHeader && onCancel !== undefined && (
        <Button type="button" variant="tertiary" onPress={onCancel}>
          Cancel
        </Button>
      )}
      {errors.length > 0 && (
        <div role="alert" className="grid gap-1 text-sm text-red-300">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
    </div>
  )
}
