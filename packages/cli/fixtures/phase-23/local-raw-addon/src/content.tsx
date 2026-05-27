import { Chip, Icon, Text } from "sireno-deck-cli"

export interface Phase23ButtonContentProps {
  label: string
}

export function Phase23ButtonContent(props: Phase23ButtonContentProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
      <Chip tone="accent">Raw TSX</Chip>
      <Icon icon="sparkles" tone="primary" />
      <Text fit="wrap">{props.label}</Text>
    </div>
  )
}
