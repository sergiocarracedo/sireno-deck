// ponytail: ambient module shim for cross-package imports. The addon's
// frontend imports the host's `Label` via the public
// `@sirenodeck/cli/ui/primitives/Label` specifier (same contract themes
// use). At runtime every context resolves it to the real component:
// browser vite (host alias), dev daemon tsx (workspace exports), and
// the bundled dist (tsdown redirects to an inert stub — Node never
// renders). This shim exists only so `tsc --noEmit` can typecheck the
// import without pulling the host's compiler graph across packages
// (which would break `rootDir` if we ever emit declarations).
declare module "@sirenodeck/cli/ui/primitives/Label" {
  import { type ReactElement } from "react"
  export type LabelVariant = "primary" | "secondary" | "small" | "xxs"
  export interface LabelProps {
    text: string
    lines?: 1 | 2 | 3
    variant?: LabelVariant
    className?: string
  }
  export function Label(props: LabelProps): ReactElement
}
