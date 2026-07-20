import type { ConnectionStatus } from "../bridge/client"

export interface ReconnectingBannerProps {
  readonly status: ConnectionStatus
  readonly disconnectedSince: number | null
  readonly attempt: number
  readonly now: number
}

const formatSeconds = (ms: number): string =>
  `${Math.floor(ms / 1000).toString()}s`

export const ReconnectingBanner = ({
  status,
  disconnectedSince,
  attempt,
  now,
}: ReconnectingBannerProps) => {
  if (status === "open" || disconnectedSince === null) return null
  const elapsed = now - disconnectedSince
  if (elapsed >= 30000) return null
  return (
    <div
      data-testid="reconnecting-banner"
      className="fixed top-0 left-0 right-0 z-50 mx-auto mt-2 max-w-md rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-amber-200 backdrop-blur"
    >
      <span className="font-medium">Reconnecting…</span>
      <span className="ml-2 text-amber-300/80">
        attempt {attempt} · {formatSeconds(elapsed)} elapsed
      </span>
    </div>
  )
}
