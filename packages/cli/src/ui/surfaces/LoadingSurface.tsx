import type { ReactElement } from "react"
import { Icon } from "../primitives/Icon"
import { Label } from "../primitives/Label"

export function LoadingSurface(): ReactElement {
  return (
    <div
      className="flex h-full w-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden"
      role="status"
      aria-label="Loading"
    >
      <style>{`
        @keyframes sireno-loading-dot {
          0%, 24.999%, 50%, 100% { opacity: 1; }
          25%, 49.999% { opacity: 0; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .sireno-loading-dot { animation: sireno-loading-dot 4s steps(1, end) infinite; }
          .sireno-loading-dot:nth-child(2) { animation-delay: 1s; }
          .sireno-loading-dot:nth-child(3) { animation-delay: 2s; }
        }
      `}</style>
      <Icon source="icon://hourglass" size={20} />
      <div className="flex items-baseline" aria-hidden="true">
        <Label text="Loading" />
        <span className="font-bold" style={{ whiteSpace: "pre" }}>
          <span className="sireno-loading-dot">.</span>
          <span className="sireno-loading-dot">.</span>
          <span className="sireno-loading-dot">.</span>
        </span>
      </div>
    </div>
  )
}
