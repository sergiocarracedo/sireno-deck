import { Icon } from "@sirenodeck/cli"
import type { ReactElement } from "react"

import { LabelValueListSurface } from "@/ui"

interface AgentPageProps {
  title: string
  status: string
  iconSource?: string
  cost?: number
  contextTokens?: number
  contextPercent?: number
  tileColor: string
  dotColor: string
}

const value = (n: number | undefined, suffix = ""): string =>
  typeof n === "number" && Number.isFinite(n) ? `${n}${suffix}` : "---"

const formatCost = (cost: number | undefined): string =>
  typeof cost === "number" && Number.isFinite(cost) && cost > 0
    ? `$${cost.toFixed(2)}`
    : "---"

export const CurrentAgentPage = ({
  title,
  status,
  iconSource,
  tileColor,
  dotColor,
}: AgentPageProps): ReactElement => (
  <div className="relative flex h-full w-full flex-col justify-between p-1">
    {tileColor !== "transparent" && (
      <div
        className="pointer-events-none absolute -inset-[5px] z-0 rounded-2xl"
        style={{ backgroundColor: tileColor, opacity: 0.32 }}
      />
    )}
    <div className="relative z-10 grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-1 py-0">
      {iconSource !== undefined ? (
        <span>
          <Icon source={iconSource} size={18} />
        </span>
      ) : (
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-label={status}
        />
      )}
      <span className="min-w-0 truncate text-[10px] font-medium uppercase opacity-80">
        {status}
      </span>
      <span className="col-span-2 row-span-3 row-start-2 min-w-0 overflow-clip text-sm font-semibold leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
        {title || <span className="opacity-40">empty</span>}
      </span>
    </div>
  </div>
)

export const AgentMetricsPage = ({
  cost,
  contextTokens,
  contextPercent,
}: AgentPageProps): ReactElement => (
  <LabelValueListSurface
    lines={[
      { label: "cost", value: formatCost(cost) },
      { label: "tokens", value: value(contextTokens) },
      { label: "context", value: value(contextPercent), units: "%" },
    ]}
  />
)
