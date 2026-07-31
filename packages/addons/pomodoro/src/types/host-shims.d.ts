// ponytail: ambient module shim for cross-package imports. The addon's
// frontend imports the host's `Label` via `@/ui/primitives/Label`. The
// host's vite resolves `@/` to `packages/cli/src/` at runtime. This
// shim lets tsc typecheck the import without pulling in the host's
// compiler graph (which would break `rootDir` and emit declarations in
// the wrong place). The runtime contract is real — vite serves the
// real Label — only the typecheck path is faked.
declare module "@/ui/primitives/Label" {
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
