import { Description } from "@heroui/react"

import { ActionValueEditor } from "../../../components/ActionValueEditor"
import type { ControlProps } from "../types"

export const ActionControl = ({
  value,
  path,
  label,
  description,
  error,
  onChange,
}: ControlProps) => (
  <div className="grid min-w-0 gap-2">
    <ActionValueEditor
      label={label}
      value={typeof value === "string" ? value : ""}
      onChange={(next) => onChange(path, next)}
    />
    {description && <Description>{description}</Description>}
    {error && (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    )}
  </div>
)
