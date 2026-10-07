import { Description, Label } from "@heroui/react"

import type { FieldPartsProps } from "./types"

export const FormFieldParts = ({
  label,
  description,
  error,
  children,
}: FieldPartsProps) => (
  <>
    <Label className="min-w-0 break-words">{label}</Label>
    <div className="min-w-0">{children}</div>
    {description && (
      <Description className="col-span-full">{description}</Description>
    )}
    {error && (
      <p role="alert" className="col-span-full text-sm text-danger">
        {error}
      </p>
    )}
  </>
)
