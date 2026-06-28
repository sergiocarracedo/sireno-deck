import type { ReactNode } from "react";

export interface ButtonFrameProps {
  pressed: boolean;
  isTapping: boolean;
  isHolding: boolean;
  holdProgress: number;
  buttonType: string;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  children: ReactNode;
}

const RING_RADIUS = 46;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const ButtonFrame = ({
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
}: ButtonFrameProps) => (
  <button
    type="button"
    role="button"
    tabIndex={0}
    data-button-type={buttonType}
    data-pressed={pressed}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerLeave={onPointerLeave}
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    onContextMenu={onContextMenu}
    className={[
      "group relative isolate aspect-square w-full overflow-hidden rounded-2xl",
      "bg-bg text-fg border-2 border-fg/10",
      "hover:border-fg/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      "transition-colors duration-150",
      "select-none",
      isTapping ? "sireno-tap" : "",
      isHolding ? "sireno-holding" : "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <span className="flex h-full w-full items-center justify-center p-1 overflow-hidden">{children}</span>
    {isHolding ? (
      <svg
        className="pointer-events-none absolute inset-1 z-10"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, holdProgress)))}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 80ms linear" }}
        />
      </svg>
    ) : null}
  </button>
);

export const ButtonFrameDefaultExport = ButtonFrame;
