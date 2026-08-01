import { useEffect, useRef, useState } from "react"

import {
  getDeviceModel,
  isKnownDeviceModel,
  type DeviceModelSpec,
} from "@/device/models"

import {
  createWsClient,
  serializeHello,
  type WsClient,
  type WsStatus,
} from "./bridge"
import { DeckFrame } from "./DeckFrame"
import { Shell } from "./Shell"
import { BridgeLogsPage } from "./pages/BridgeLogsPage"
import { ServiceLogsPage } from "./pages/ServiceLogsPage"
import { AddonsPage, type AddonInventory } from "./pages/AddonsPage"
import { ConfigPage } from "./pages/ConfigPage"

const ENV_WS_URL = (import.meta.env.VITE_WS_URL ??
  "ws://127.0.0.1:52937") as string
const ENV_FRONTEND_URL = (import.meta.env.VITE_FRONTEND_URL ??
  "http://127.0.0.1:5180") as string

const VIRTUAL_DEVICE_IDS = ["mk2", "mini", "xl"] as const

const DEFAULT_DEVICE_MODEL = getDeviceModel("mk2")

interface DeviceSelectorProps {
  readonly device: string
  readonly onChange: (deviceId: string) => void
}

const DeviceSelector = ({ device, onChange }: DeviceSelectorProps) => {
  return (
    <label className="flex shrink-0 items-center gap-2">
      <span className="text-neutral-500">device</span>
      <select
        value={device}
        onChange={(e) => onChange(e.target.value)}
        data-testid="top-device-selector"
        className="cursor-pointer rounded bg-neutral-800 px-2 py-1 text-[11px] text-neutral-100"
      >
        {VIRTUAL_DEVICE_IDS.map((id) => {
          const model = getDeviceModel(id)
          return (
            <option key={id} value={id}>
              {model.name}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export interface AppProps {
  readonly wsUrl?: string
  readonly initialDeviceModel?: string
  readonly initialSection?: string
}

const SECTIONS = [
  "device",
  "bridge-logs",
  "service-logs",
  "addons",
  "config",
] as const

const isValidSection = (s: string | null): s is (typeof SECTIONS)[number] =>
  s !== null && (SECTIONS as ReadonlyArray<string>).includes(s)

export const App = ({
  wsUrl = ENV_WS_URL,
  initialDeviceModel,
  initialSection = "device",
}: AppProps = {}): React.ReactElement => {
  const [activeSection, setActiveSection] = useState<string>(initialSection)
  const [connectionStatus, setConnectionStatus] =
    useState<WsStatus>("connecting")
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(
    null,
  )
  useEffect(() => {
    disconnectedSinceRef.current = disconnectedSince
  }, [disconnectedSince])
  const [attempt, setAttempt] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [deckId, setDeckId] = useState<string>("")
  const [deckName, setDeckName] = useState<string>("")
  // ponytail: addon inventory arrives over the WS bridge as a follow-up
  // to hello-ack (see protocol-internal.addonsInventoryMessageSchema).
  // Receiving it here avoids the previous `/api/addons` fetch, which the
  // start-mode daemon used to serve but isn't bound in --emulator mode.
  const [addonInventory, setAddonInventory] = useState<AddonInventory | null>(
    null,
  )
  const [deviceModel, setDeviceModel] = useState<DeviceModelSpec>(() =>
    initialDeviceModel !== undefined && isKnownDeviceModel(initialDeviceModel)
      ? getDeviceModel(initialDeviceModel)
      : DEFAULT_DEVICE_MODEL,
  )
  const clientRef = useRef<WsClient | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  // ponytail: ignore the first `closed` after an `open` — happens during
  // WS-replacement that some React navigations trigger. Latch only after a
  // short delay so transient reconnects don't pop the banner.
  const lastStatusRef = useRef<WsStatus | null>(null)
  const reconnectLatchTimerRef = useRef<number | null>(null)
  const disconnectedSinceRef = useRef<number | null>(null)

  useEffect(() => {
    clientRef.current = createWsClient({
      url: wsUrl,
      onStatus: (status) => {
        const previous = lastStatusRef.current
        lastStatusRef.current = status
        setConnectionStatus(status)
        setAttempt(clientRef.current?.attemptCount() ?? 0)
        if (status === "open") {
          if (reconnectLatchTimerRef.current !== null) {
            window.clearTimeout(reconnectLatchTimerRef.current)
            reconnectLatchTimerRef.current = null
          }
          setDisconnectedSince(null)
          return
        }
        if (status === "connecting") {
          return
        }
        if (status === "closed") {
          if (previous === "open") {
            if (reconnectLatchTimerRef.current !== null) {
              window.clearTimeout(reconnectLatchTimerRef.current)
            }
            const openedAt = Date.now()
            reconnectLatchTimerRef.current = window.setTimeout(() => {
              reconnectLatchTimerRef.current = null
              setDisconnectedSince((current) =>
                current === null ? openedAt : current,
              )
            }, 500)
            return
          }
          setDisconnectedSince((current) =>
            current === null ? Date.now() : current,
          )
        }
      },
      wsFactory: (url: string) => {
        const ws = new WebSocket(url)
        ws.addEventListener("open", () => {
          ws.send(serializeHello())
        })
        return ws as unknown as { send: (d: string) => void; close: () => void }
      },
      onMessage: (raw: unknown) => {
        let m: Record<string, unknown>
        try {
          m = JSON.parse(String(raw)) as Record<string, unknown>
        } catch {
          return
        }
        if (m.type === "device-info") {
          const device = m.device as Record<string, unknown> | undefined
          const modelId = device?.model
          if (typeof modelId === "string" && isKnownDeviceModel(modelId)) {
            setDeviceModel(getDeviceModel(modelId))
          }
        }
        if (m.type === "deck-config") {
          const id = typeof m.deckId === "string" ? m.deckId : ""
          setDeckId(id)
          const surfaces = m.surfaces as
            | Record<string, { name?: string }>
            | undefined
          setDeckName(surfaces?.[id]?.name ?? id)
        }
        if (m.type === "addons-inventory") {
          const addons = m.addons
          if (Array.isArray(addons)) {
            setAddonInventory({ addons } as AddonInventory)
          }
        }
        if (typeof m.type === "string" && m.type.endsWith("error")) {
          setLastError(String(m.type))
        }
        if (m.type === "iframe-reload") {
          // ponytail: asked by the CLI to reload the frontend iframe. The
          // SPA stays mounted (so device/connection state survives) — only
          // the inner iframe is reloaded, picking up the latest frontend
          // bundle from vite (which has HMR'd the source).
          iframeRef.current?.contentWindow?.location.reload()
        }
      },
    })
    const timer = setInterval(() => {
      if (disconnectedSinceRef.current === null) {
        return
      }
      setNow(Date.now())
    }, 250)
    return () => {
      clearInterval(timer)
      clientRef.current?.close()
      clientRef.current = null
      if (reconnectLatchTimerRef.current !== null) {
        window.clearTimeout(reconnectLatchTimerRef.current)
        reconnectLatchTimerRef.current = null
      }
    }
  }, [wsUrl])

  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash.replace(/^#\/?/, "")
    if (isValidSection(hash)) {
      setActiveSection(hash)
    }
  }, [])

  const onSelect = (path: string): void => {
    if (!isValidSection(path)) return
    setActiveSection(path)
    if (typeof window !== "undefined") {
      window.location.hash = `#/${path}`
    }
  }

  const renderActive = (): React.ReactNode => {
    if (activeSection === "bridge-logs") return <BridgeLogsPage />
    if (activeSection === "service-logs") return <ServiceLogsPage />
    if (activeSection === "addons")
      return <AddonsPage addonInventory={addonInventory} />
    if (activeSection === "config") return <ConfigPage />
    return null
  }

  const sendButtonAction = (msg: {
    deckId: string
    position: number
    gesture: "tap" | "dbl-tap" | "hold"
  }): void => {
    clientRef.current?.send(JSON.stringify(msg))
  }

  const setDevice = (deviceId: string): void => {
    if (
      !VIRTUAL_DEVICE_IDS.includes(
        deviceId as (typeof VIRTUAL_DEVICE_IDS)[number],
      )
    )
      return
    setDeviceModel(getDeviceModel(deviceId))
    clientRef.current?.send(JSON.stringify({ type: "set-device", deviceId }))
  }

  const elapsed = disconnectedSince === null ? 0 : now - disconnectedSince
  const showBsod =
    connectionStatus !== "open" &&
    disconnectedSince !== null &&
    elapsed >= 30000
  const showBanner =
    connectionStatus !== "open" && disconnectedSince !== null && elapsed < 30000

  return (
    <Shell
      activeSection={activeSection}
      onSelect={onSelect}
      content={
        <>
          <div className="flex h-full flex-col">
            <header className="flex shrink-0 items-center gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
              <span className="truncate text-neutral-500">
                {deckName || "Awaiting deck-config"}
              </span>
              <span className="text-neutral-500">·</span>
              <span className="truncate" title={wsUrl}>
                ws: {wsUrl}
              </span>
              <span className="text-neutral-500">·</span>
              <span className="truncate" title={ENV_FRONTEND_URL}>
                fe: {ENV_FRONTEND_URL}
              </span>
              <span className="flex-1" />
              <DeviceSelector device={deviceModel.id} onChange={setDevice} />
            </header>
            <div className="flex flex-1 overflow-hidden">
              <section className="flex-1 overflow-auto p-4">
                {activeSection === "device" ? (
                  deckId === "" ? (
                    <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                      Awaiting deck-config…
                    </p>
                  ) : (
                    <DeckFrame
                      frontendUrl={ENV_FRONTEND_URL}
                      device={deviceModel}
                      deckId={deckId}
                      onGesture={sendButtonAction}
                      onIframeRef={(el) => {
                        iframeRef.current = el
                      }}
                    />
                  )
                ) : (
                  renderActive()
                )}
              </section>
            </div>
          </div>
          {showBanner && (
            <div
              data-testid="reconnecting-banner"
              className="fixed top-2 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-amber-200 backdrop-blur"
            >
              <span className="font-medium">Reconnecting…</span>
              <span className="ml-2 text-amber-300/80">
                attempt {attempt} · {Math.floor(elapsed / 1000)}s elapsed
              </span>
            </div>
          )}
          {showBsod && (
            <div
              data-testid="disconnected-overlay"
              className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/90 backdrop-blur"
            >
              <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-neutral-900/95 p-8 text-center shadow-2xl">
                <h2 className="mb-2 text-2xl font-semibold text-red-400">
                  Connection lost
                </h2>
                <p className="mb-6 text-sm text-neutral-400">
                  {connectionStatus === "failed"
                    ? `Failed to reconnect after ${attempt} attempts`
                    : "Disconnected"}
                </p>
                <dl className="space-y-2 text-left text-sm">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Status</dt>
                    <dd className="font-mono text-neutral-200">
                      {connectionStatus}
                    </dd>
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
                      {Math.floor(elapsed / 60 / 1000)
                        .toString()
                        .padStart(2, "0")}
                      :
                      {Math.floor((elapsed / 1000) % 60)
                        .toString()
                        .padStart(2, "0")}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </>
      }
      wsClient={clientRef.current}
    />
  )
}
