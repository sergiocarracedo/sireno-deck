declare module "@sirenodeck/sirenodeck/ui/surfaces/IconLabelSurface" {
  import type { ReactElement } from "react"
  export function IconLabelSurface(props: {
    source?: string
    label: string
  }): ReactElement
}

declare module "@sirenodeck/sirenodeck/ui/surfaces/BinaryToggleSurface" {
  import type { ReactElement } from "react"
  export function BinaryToggleSurface(props: {
    label: string
    labelColor?: string
    source?: string
    variant?:
      | "accent"
      | "danger"
      | "foreground"
      | "primary"
      | "success"
      | "muted"
    status: boolean
    details?: string
  }): ReactElement
}

declare module "@sirenodeck/sirenodeck/ui/surfaces/LoadingSurface" {
  import type { ReactElement } from "react"
  export function LoadingSurface(): ReactElement
}
