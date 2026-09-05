import { Icon } from "@sirenodeck/cli"
import type { ReactElement } from "react"

import { LabelValueListSurface } from "@/ui"

interface AgentPageProps {
  title: string
  sessionId?: string
  directory?: string
  lastMessagePreview?: string
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

// ponytail: compact token counts — k, M, kM (european milliard, 10^9),
// MM (european billion, 10^12).
const TOKEN_UNITS: ReadonlyArray<[number, string]> = [
  [1_000_000_000_000, "MM"],
  [1_000_000_000, "kM"],
  [1_000_000, "M"],
  [1_000, "k"],
]

export const formatTokens = (tokens: number | undefined): string => {
  if (typeof tokens !== "number" || !Number.isFinite(tokens)) return "---"
  let n = tokens
  for (const [factor, unit] of TOKEN_UNITS) {
    if (Math.abs(n) < factor) continue
    const scaled = n / factor
    if (Math.round(scaled) >= 1000) continue
    const rounded =
      scaled >= 10 || scaled <= -10
        ? Math.round(scaled)
        : Math.round(scaled * 10) / 10
    return `${rounded}${unit}`
  }
  return `${Math.round(n)}`
}

const formatCost = (cost: number | undefined): string =>
  typeof cost === "number" && Number.isFinite(cost) && cost >= 0
    ? `$${cost.toFixed(2)}`
    : "---"

const shortPath = (directory: string | undefined): string => {
  if (directory === undefined || directory.length === 0) return "---"
  return directory.split(/[\\/]/).at(-1) || directory
}

const shortSessionId = (sessionId: string | undefined): string =>
  sessionId === undefined || sessionId.length === 0
    ? "---"
    : sessionId.slice(-8)

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
}: AgentPageProps): ReactElement => (
  <LabelValueListSurface
    lines={[
      { label: "cost", value: formatCost(cost), icon: "icon://coins" },
      {
        label: "tokens",
        value: formatTokens(contextTokens),
        icon: "icon://activity",
      },
    ]}
  />
)

export const AgentContextPage = ({
  contextPercent,
  directory,
}: AgentPageProps): ReactElement => (
  <LabelValueListSurface
    lines={[
      {
        label: "context",
        value: value(contextPercent),
        units: "%",
        icon: "icon://cpu",
      },
      { label: "project", value: shortPath(directory), icon: "icon://folder" },
    ]}
  />
)

export const AgentDetailsPage = ({
  sessionId,
  lastMessagePreview,
}: AgentPageProps): ReactElement => (
  <LabelValueListSurface
    lines={[
      {
        label: "session",
        value: shortSessionId(sessionId),
        icon: "icon://clock",
      },
      {
        label: "activity",
        value: lastMessagePreview ?? "---",
        icon: "icon://terminal",
      },
    ]}
  />
)
