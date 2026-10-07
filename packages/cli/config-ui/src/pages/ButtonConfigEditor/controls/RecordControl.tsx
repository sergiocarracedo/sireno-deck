import { useState } from "react"

import {
  Button,
  Description,
  Fieldset,
  Input,
  Label,
  TextField,
} from "@heroui/react"
import { Trash2 } from "lucide-react"

import { defaultValue, joinPath, labelFor } from "../utils"
import type { ControlProps } from "../types"

const ENTRY_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1"

export const RecordControl = ({
  schema,
  value,
  path,
  error,
  onChange,
  renderConfig,
  deckOptions,
  onPendingAssetChange,
}: ControlProps) => {
  const [newKey, setNewKey] = useState("")
  const record =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const itemSchema =
    typeof schema.additionalProperties === "object"
      ? schema.additionalProperties
      : { type: "string" }

  return (
    <Fieldset className="grid gap-2 rounded-lg border border-separator bg-surface-secondary p-2">
      <Fieldset.Legend className="px-1 text-sm text-neutral-300">
        {schema.title ?? labelFor(path.split(".").at(-1) ?? "Entries")}
      </Fieldset.Legend>
      {schema.description && <Description>{schema.description}</Description>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {Object.entries(record).map(([key, item]) => (
        <div
          key={key}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2"
        >
          {renderConfig({
            schema: itemSchema,
            value: item,
            path: joinPath(path, key),
            onChange,
            deckOptions,
            onPendingAssetChange,
          })}
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            isIconOnly
            aria-label={`Delete ${key}`}
            onPress={() => {
              const next = { ...record }
              delete next[key]
              onChange(path, next)
            }}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex min-w-0 items-center gap-2">
        <TextField className={`${ENTRY_ROW_CLASS} flex-1`}>
          <Label className="min-w-0 break-words">Entry name</Label>
          <Input
            aria-label="New entry name"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
          />
        </TextField>
        <Button
          type="button"
          variant="secondary"
          isDisabled={newKey.trim() === "" || newKey in record}
          onPress={() => {
            const key = newKey.trim()
            if (key === "" || key in record) return
            onChange(path, { ...record, [key]: defaultValue(itemSchema) })
            setNewKey("")
          }}
        >
          Add
        </Button>
      </div>
    </Fieldset>
  )
}
