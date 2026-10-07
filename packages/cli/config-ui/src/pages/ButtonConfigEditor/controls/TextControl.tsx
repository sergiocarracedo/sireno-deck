import { Input, TextField } from "@heroui/react"

import { FormFieldParts } from "../FormFieldParts"
import type { ControlProps } from "../types"

const CONTROL_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1"

export const TextControl = ({
  schema,
  value,
  path,
  label,
  description,
  error,
  onChange,
}: ControlProps) => {
  const inputType =
    schema.type === "number" || schema.type === "integer" ? "number" : "text"

  return (
    <TextField className={`${CONTROL_ROW_CLASS} text-sm`}>
      <FormFieldParts label={label} description={description} error={error}>
        <Input
          aria-label={label}
          type={inputType}
          value={String(value ?? "")}
          onChange={(event) => {
            const raw = event.target.value
            onChange(path, inputType === "number" ? Number(raw) : raw)
          }}
        />
      </FormFieldParts>
    </TextField>
  )
}
