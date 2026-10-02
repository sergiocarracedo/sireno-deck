import type { ReactNode } from "react"

import type { PendingIconAsset } from "../../components/IconPicker"

export interface JsonSchema {
  readonly type?: string
  readonly title?: string
  readonly description?: string
  readonly default?: unknown
  readonly const?: unknown
  readonly enum?: unknown[]
  readonly properties?: Record<string, JsonSchema>
  readonly required?: string[]
  readonly items?: JsonSchema
  readonly minItems?: number
  readonly maxItems?: number
  readonly oneOf?: JsonSchema[]
  readonly anyOf?: JsonSchema[]
  readonly additionalProperties?: JsonSchema | boolean
  readonly $defs?: Record<string, JsonSchema>
  readonly $ref?: string
  readonly internal?: boolean
  readonly "x-control"?: string
}

export interface ValidationState {
  readonly requestId: string
  readonly valid: boolean
  readonly errors: string[]
}

export interface ButtonAppearance {
  readonly variant: string
  readonly actions: { tap?: string; dbltap?: string; hold?: string }
}

export interface ButtonThemeVariant {
  readonly background: string
  readonly border: string
  readonly foreground: string
}

export interface ConfigFormProps {
  readonly schema: JsonSchema
  readonly value: unknown
  readonly path: string
  readonly onChange: (path: string, value: unknown) => void
  readonly deckOptions?: readonly { id: string; name: string }[]
  readonly compact?: boolean
  readonly onPendingAssetChange?: (
    path: string,
    asset: PendingIconAsset | null,
  ) => void
}

export interface ControlProps extends ConfigFormProps {
  readonly label: string
  readonly description?: string
  readonly renderConfig: (props: ConfigFormProps) => ReactNode
}

export interface FieldPartsProps {
  readonly label: string
  readonly description?: string
  readonly error?: string
  readonly children: ReactNode
}
