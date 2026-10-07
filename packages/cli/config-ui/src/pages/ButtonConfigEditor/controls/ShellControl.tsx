import { TextArea, TextField } from "@heroui/react"

import { FormFieldParts } from "../FormFieldParts"
import type { ControlProps } from "../types"

const CONTROL_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-start gap-x-3 gap-y-1"

export const ShellControl = ({
  value,
  path,
  label,
  description,
  error,
  onChange,
}: ControlProps) => (
  <TextField className={CONTROL_ROW_CLASS}>
    <FormFieldParts label={label} description={description} error={error}>
      <TextArea
        aria-label={label}
        rows={3}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(path, event.target.value)}
        spellCheck={false}
        className="min-h-20 w-full resize-y font-mono text-sm"
      />
    </FormFieldParts>
  </TextField>
)
