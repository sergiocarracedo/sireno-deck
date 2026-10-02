import { Description, Label, Switch } from "@heroui/react"

import type { ControlProps } from "../types"

const CONTROL_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1"

export const BooleanControl = ({
  value,
  path,
  label,
  description,
  error,
  onChange,
}: ControlProps) => (
  <Switch
    isSelected={value === true}
    onChange={(next) => onChange(path, next)}
    className="w-full min-w-0"
  >
    <Switch.Content className={`${CONTROL_ROW_CLASS} w-full cursor-pointer`}>
      <Label className="min-w-0 break-words">{label}</Label>
      <Switch.Control className="justify-self-start">
        <Switch.Thumb />
      </Switch.Control>
    </Switch.Content>
    {description && <Description>{description}</Description>}
    {error && (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    )}
  </Switch>
)
