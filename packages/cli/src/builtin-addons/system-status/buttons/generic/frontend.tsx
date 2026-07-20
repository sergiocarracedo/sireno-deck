import { useAddonChannel } from "@/api/react"
import type { AddonFrontendButton } from "@/addon/api"

interface MetricPayload {
  value: number
  total?: number
  used?: number
  unit: string
}

interface GenericConfig {
  metric: string
  label?: string
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  return `${(bytes / 1024 ** 4).toFixed(1)} TB`
}

const GenericStatusButton: AddonFrontendButton<GenericConfig> = ({
  config,
}) => {
  const cfg = config as GenericConfig
  const metric = cfg.metric
  const label = cfg.label ?? metric.toUpperCase()
  const { data } = useAddonChannel<MetricPayload>(
    `runtime:system-status:${metric}`,
  )
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
      <span className="text-xs uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      {data === undefined ? (
        <span className="font-mono text-sm text-neutral-400">—</span>
      ) : (
        <>
          <span className="font-mono text-2xl font-semibold text-neutral-100">
            {data.value}
            {data.unit}
          </span>
          {data.used !== undefined && data.total !== undefined && (
            <span className="font-mono text-[10px] text-neutral-500">
              {formatBytes(data.used)} / {formatBytes(data.total)}
            </span>
          )}
        </>
      )}
    </div>
  )
}

export default GenericStatusButton
