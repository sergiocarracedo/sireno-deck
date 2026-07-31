import { type ReactElement } from "react"

// ponytail: stub used by addon unit tests only. The real
// @/ui/primitives/Label lives in the host package and pulls in React
// hooks + theme presentation that don't make sense to load from a
// node-only vitest run. Tests for the addon manifest never render
// JSX, so a type-correct stub is enough.

export type LabelVariant = "primary" | "secondary" | "small" | "xxs"

export interface LabelProps {
  text: string
  lines?: 1 | 2 | 3
  variant?: LabelVariant
  className?: string
}

export function Label(_props: LabelProps): ReactElement {
  return null as unknown as ReactElement
}
