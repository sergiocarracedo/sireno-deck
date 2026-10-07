import { Button, Label } from "@heroui/react"

export interface PositionPickerProps {
  readonly mode: "edit" | "add"
  readonly keyCount: number
  readonly selected: number | null
  readonly unset?: boolean
  readonly disabledPositions?: readonly number[]
  readonly onSelect: (position: number) => void
  readonly onHover?: (position: number | null) => void
  readonly onFirstAvailable?: () => void
  readonly onUnset?: () => void
}

export const PositionPicker = ({
  mode,
  keyCount,
  selected,
  unset = false,
  disabledPositions = [],
  onSelect,
  onHover,
  onFirstAvailable,
  onUnset,
}: PositionPickerProps) => (
  <div className="grid content-start gap-1 text-sm">
    <Label>Position</Label>
    {onFirstAvailable !== undefined && (
      <Button
        type="button"
        size="sm"
        variant="tertiary"
        className="h-[30px] min-w-0 justify-start px-2 text-xs"
        onPress={onFirstAvailable}
      >
        First available
      </Button>
    )}
    <div className="grid grid-cols-[repeat(5,30px)] justify-center gap-[3px]">
      {Array.from({ length: keyCount }, (_, position) => {
        const isLastPosition = mode === "add" && position === keyCount - 1
        const isSelected = isLastPosition ? unset : selected === position
        const isDisabled =
          !isLastPosition && disabledPositions.includes(position)
        return (
          <Button
            key={position}
            type="button"
            size="sm"
            variant="secondary"
            aria-label={`Position ${position}`}
            aria-pressed={isSelected}
            isDisabled={isDisabled}
            onMouseEnter={() => onHover?.(position)}
            onMouseLeave={() => onHover?.(null)}
            onPress={() => {
              if (isLastPosition) onUnset?.()
              else onSelect(position)
            }}
            className="h-[30px] min-w-[30px] rounded border border-separator bg-surface-secondary p-0 text-xs text-foreground hover:bg-surface-secondary hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-primary aria-pressed:border-primary aria-pressed:bg-white aria-pressed:text-neutral-950 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-primary"
          >
            {isLastPosition ? "∅" : position + 1}
          </Button>
        )
      })}
    </div>
  </div>
)
