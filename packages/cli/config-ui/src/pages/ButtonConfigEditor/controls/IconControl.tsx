import { Description } from "@heroui/react"

import { IconPicker } from "../../../components/IconPicker"
import type { ControlProps } from "../types"

export const IconControl = ({
  value,
  path,
  label,
  description,
  error,
  onChange,
  onPendingAssetChange,
}: ControlProps) => (
  <div className="grid min-w-0 gap-2">
    <IconPicker
      label={label}
      value={typeof value === "string" ? value : ""}
      onApply={(next, asset) => {
        onChange(path, next)
        onPendingAssetChange?.(path, asset ?? null)
      }}
    />
    {description && <Description>{description}</Description>}
    {error && (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    )}
  </div>
)
