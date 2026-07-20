import { useAddonChannel } from "@/api/react"
import type { AddonFrontendButton } from "@/addon/api"

interface MetricPayload {
  value: number
  total?: number
  used?: number
  unit: string
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  return `${(bytes / 1024 ** 4).toFixed(1)} TB`
}

const Progress = ({
  label,
  payload,
}: {
  label: string
  payload: MetricPayload | undefined
}) => {
  if (payload === undefined) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <span className="text-xs uppercase tracking-widest text-neutral-500">
          {label}
        </span>
        <span className="font-mono text-sm text-neutral-400">—</span>
      </div>
    )
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
      <span className="text-xs uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold text-neutral-100">
        {payload.value}
        {payload.unit}
      </span>
      {payload.used !== undefined && payload.total !== undefined && (
        <span className="font-mono text-[10px] text-neutral-500">
          {formatBytes(payload.used)} / {formatBytes(payload.total)}
        </span>
      )}
    </div>
  )
}

const CpuButton: AddonFrontendButton<Record<string, never>> = () => {
  const { data } = useAddonChannel<MetricPayload>("runtime:system-status:cpu")
  return <Progress label="CPU" payload={data} />
}

const RamButton: AddonFrontendButton<Record<string, never>> = () => {
  const { data } = useAddonChannel<MetricPayload>("runtime:system-status:ram")
  return <Progress label="RAM" payload={data} />
}

const DiskButton: AddonFrontendButton<Record<string, never>> = () => {
  const { data } = useAddonChannel<MetricPayload>("runtime:system-status:disk")
  return <Progress label="DISK" payload={data} />
}

const NetButton: AddonFrontendButton<Record<string, never>> = () => {
  const { data } = useAddonChannel<MetricPayload>("runtime:system-status:net")
  return <Progress label="NET" payload={data} />
}

export default CpuButton
export { RamButton, DiskButton, NetButton }
