import type { ReactNode } from "react"

interface MockButtonFrameProps {
  pressed: boolean
  isTapping: boolean
  isHolding: boolean
  holdProgress: number
  buttonType: string
  onPointerDown: () => void
  onPointerUp: () => void
  onPointerLeave: () => void
  onClick: () => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  children?: ReactNode
}

const MockButtonFrame = ({
  pressed,
  isTapping,
  isHolding,
  holdProgress,
  buttonType,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onClick,
  onDoubleClick,
  onContextMenu,
  children,
}: MockButtonFrameProps) => (
  <button
    type="button"
    data-button-type={buttonType}
    data-pressed={pressed}
    data-tapping={isTapping}
    data-holding={isHolding}
    data-hold-progress={holdProgress}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerLeave={onPointerLeave}
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    onContextMenu={onContextMenu}
    className="mock-button-frame"
  >
    {children}
  </button>
)

export const activeTheme = {
  name: "default",
  frontendPath: "/__mocks__/themes/default/index",
}

export const components = {
  Icon: () => null,
  Label: () => null,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  TapIndicator: () => null,
  Chip: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}

export const surfaces = {
  IconLabel: ({ label }: { label: string }) => <span>{label}</span>,
  Bars: () => null,
  LabelValueList: () => null,
  SplitAction: () => null,
}

export const primitives = {
  ButtonFrame: MockButtonFrame,
}

export default { activeTheme, components, surfaces, primitives }
