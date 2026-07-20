import type { ConnectionStatus } from "../bridge/client"

export interface DisconnectedOverlayProps {
  readonly status: ConnectionStatus
  readonly disconnectedSince: number | null
  readonly attempt: number
  readonly lastError: string | null
  readonly now: number
}

const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`
}

const statusText = (status: ConnectionStatus, attempt: number): string => {
  if (status === "failed") return `Failed to reconnect after ${attempt} attempts`
  if (status === "closed") return "Disconnected"
  if (status === "connecting") return "Connecting…"
  return status
}

export const DisconnectedOverlay = ({
  status,
  disconnectedSince,
  attempt,
  lastError,
  now,
}: DisconnectedOverlayProps) => {
  if (status === "open" || disconnectedSince === null) return null
  const elapsed = now - disconnectedSince
  if (elapsed < 30000) return null
  return (
    <div
      data-testid="disconnected-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/90 backdrop-blur"
    >
      <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-neutral-900/95 p-8 text-center shadow-2xl">
        <h2 className="mb-2 text-2xl font-semibold text-red-400">
          Connection lost
        </h2>
        <p className="mb-6 text-sm text-neutral-400">
          {statusText(status, attempt)}
        </p>
        <dl className="space-y-2 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Status</dt>
            <dd className="font-mono text-neutral-200">{status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Reconnect attempts</dt>
            <dd className="font-mono text-neutral-200">{attempt}</dd>
          </div>
          {lastError !== null && (
            <div className="flex justify-between">
              <dt className="text-neutral-500">Last error</dt>
              <dd className="truncate font-mono text-neutral-200">
                {lastError}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-neutral-500">Elapsed</dt>
            <dd className="font-mono text-neutral-200">
              {formatElapsed(elapsed)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
