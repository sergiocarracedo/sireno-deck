import { Text, Label } from '@/ui/index'

interface ActionRenderCtx {
  readonly buttonType?: string
  readonly config?: { label?: string; command?: string; deck?: string }
}

const Component = (props: ActionRenderCtx) => {
  const type = props.buttonType ?? ''
  const label =
    props.config?.label ?? props.config?.command ?? props.config?.deck ?? type

  if (type === 'core:change-deck') {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
        <Text size="sm" tone="fg">
          {label}
        </Text>
      </span>
    )
  }

  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
      <Label>{label}</Label>
    </span>
  )
}

export default Component
