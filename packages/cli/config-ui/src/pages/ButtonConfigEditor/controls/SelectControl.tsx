import { ListBox, Select } from "@heroui/react"

import { FormFieldParts } from "../FormFieldParts"
import type { ControlProps } from "../types"

const CONTROL_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1"

export const SelectControl = ({
  schema,
  value,
  path,
  label,
  description,
  error,
  onChange,
}: ControlProps) => (
  <Select
    className={CONTROL_ROW_CLASS}
    variant="secondary"
    selectedKey={JSON.stringify(value)}
    onSelectionChange={(key) => onChange(path, JSON.parse(String(key)))}
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
        {(schema.enum ?? []).map((option) => (
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
