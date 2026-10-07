import { ListBox, Select } from "@heroui/react"

import { FormFieldParts } from "../FormFieldParts"
import { defaultValue, labelFor } from "../utils"
import type { ControlProps } from "../types"

const CONTROL_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1"

export const UnionControl = (props: ControlProps) => {
  const { schema, value, path, onChange, renderConfig } = props
  const variants = schema.oneOf ?? schema.anyOf ?? []
  const currentType =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>).type
      : undefined
  const discriminatedIndex = variants.findIndex(
    (variant) =>
      variant.properties?.type?.enum?.includes(currentType) ||
      variant.properties?.type?.const === currentType,
  )
  const currentKeys =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? Object.keys(value)
      : []
  const selectedIndex =
    discriminatedIndex >= 0
      ? discriminatedIndex
      : Math.max(
          0,
          variants.reduce((bestIndex, variant, index) => {
            const score = currentKeys.filter((key) =>
              Object.prototype.hasOwnProperty.call(
                variant.properties ?? {},
                key,
              ),
            ).length
            const best = variants[bestIndex]!
            const bestScore = currentKeys.filter((key) =>
              Object.prototype.hasOwnProperty.call(best.properties ?? {}, key),
            ).length
            return score > bestScore ? index : bestIndex
          }, 0),
        )
  const selectedSchema = variants[selectedIndex] ?? variants[0]!
  const label = `${labelFor(path.split(".").at(-1) ?? "Value")} type`

  return (
    <div className="grid gap-2">
      <Select
        className={CONTROL_ROW_CLASS}
        variant="secondary"
        selectedKey={String(selectedIndex)}
        aria-label={label}
        onSelectionChange={(key) => {
          const nextSchema = variants[Number(key)] ?? selectedSchema
          onChange(path, defaultValue(nextSchema))
        }}
      >
        <FormFieldParts
          label={label}
          description={schema.description}
          error={props.error}
        >
          <Select.Trigger className="w-full min-w-0 border border-separator bg-field-background">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
        </FormFieldParts>
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
      {renderConfig({
        schema: selectedSchema,
        value,
        path,
        onChange,
        deckOptions: props.deckOptions,
        compact: props.compact,
        onPendingAssetChange: props.onPendingAssetChange,
      })}
    </div>
  )
}
