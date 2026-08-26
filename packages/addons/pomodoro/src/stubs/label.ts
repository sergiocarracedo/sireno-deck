// ponytail: stub for `@sirenodeck/cli/ui/primitives/Label`. The daemon loads the addon's
// dist/index.mjs via plain Node `import()`, which has no knowledge of the
// host's vite aliases. The CLI's vite (when running the frontend SPA)
// resolves `@sirenodeck/cli/ui/primitives/Label` to the real host component and ignores
// this stub. The daemon never renders — it just reads the manifest — so
// any consumer of Label at module-load time is a no-op.

import type { ReactElement } from "react"

interface LabelProps {
  text: string
  variant?: string
  lines?: number
  className?: string
}

const Label = (_props: LabelProps): ReactElement | null => null

export default Label
export { Label }
export type { LabelProps }
