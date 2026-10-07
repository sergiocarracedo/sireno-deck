import { ListBox, Select } from "@heroui/react"

import { FormFieldParts } from "../FormFieldParts"
import type { ControlProps } from "../types"

const CONTROL_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1"

export const DeckSelectControl = ({
  value,
  path,
  label,
  description,
  error,
  deckOptions = [],
  onChange,
}: ControlProps) => (
  <Select
    className={CONTROL_ROW_CLASS}
    variant="secondary"
    selectedKey={typeof value === "string" ? value : ""}
    onSelectionChange={(key) => onChange(path, String(key))}
    aria-label={label}
  >
    <FormFieldParts label={label} description={description} error={error}>
      <Select.Trigger className="w-full min-w-0 border border-separator bg-field-background">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
    </FormFieldParts>
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
