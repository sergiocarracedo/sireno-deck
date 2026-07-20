import { useSearchParams } from "react-router-dom"

interface DevicePageProps {
  wsUrl: string
}

export const DevicePage = ({ wsUrl }: DevicePageProps) => {
  const [params, setParams] = useSearchParams()
  const device = params.get("device") ?? "default"

  const onChange = (next: string): void => {
    setParams({ device: next })
  }

  return (
    <div
      data-testid="device-page"
      className="flex h-full flex-col items-center justify-center gap-3 p-4"
    >
      <label className="font-mono text-xs uppercase tracking-widest text-neutral-400">
        device model
      </label>
      <select
        value={device}
        onChange={(e) => onChange(e.target.value)}
        data-testid="device-page-selector"
        className="rounded bg-neutral-800 px-3 py-1 text-sm text-neutral-100"
      >
        <option value="default">default</option>
        <option value="xl">Stream Deck XL</option>
        <option value="plus">Stream Deck +</option>
        <option value="mini">Stream Deck Mini</option>
      </select>
      <p className="font-mono text-[10px] text-neutral-500">
        ws: {wsUrl}
      </p>
    </div>
  )
}
