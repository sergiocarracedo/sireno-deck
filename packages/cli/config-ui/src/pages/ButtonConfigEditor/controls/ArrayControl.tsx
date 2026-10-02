import { Button, Description, Fieldset } from "@heroui/react"
import { Trash2 } from "lucide-react"

import { defaultValue, joinPath, labelFor } from "../utils"
import type { ControlProps } from "../types"

export const ArrayControl = ({
  schema,
  value,
  path,
  error,
  onChange,
  renderConfig,
  deckOptions,
  onPendingAssetChange,
}: ControlProps) => {
  const items = Array.isArray(value) ? value : []
  const itemSchema = schema.items ?? { type: "string" }

  return (
    <Fieldset className="grid gap-2 rounded-lg border border-separator bg-surface-secondary p-2">
      <Fieldset.Legend className="px-1 text-sm text-neutral-300">
        {schema.title ?? labelFor(path.split(".").at(-1) ?? "Items")}
      </Fieldset.Legend>
      {schema.description && <Description>{schema.description}</Description>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {items.map((item, index) => (
        <div
          key={`${path}-${index}`}
          className="flex min-w-0 items-start gap-2"
        >
          <div className="min-w-0 flex-1">
            {renderConfig({
              schema: itemSchema,
              value: item,
              path: joinPath(path, index),
              onChange,
              deckOptions,
              compact: true,
              onPendingAssetChange,
            })}
          </div>
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            isIconOnly
            aria-label={`Delete item ${index + 1}`}
            onPress={() =>
              onChange(
                path,
                items.filter((_, itemIndex) => itemIndex !== index),
              )
            }
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        isDisabled={
          schema.maxItems !== undefined && items.length >= schema.maxItems
        }
        onPress={() => onChange(path, [...items, defaultValue(itemSchema)])}
      >
        + Add item
      </Button>
    </Fieldset>
  )
}
