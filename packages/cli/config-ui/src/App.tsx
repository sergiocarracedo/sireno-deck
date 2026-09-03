import { useEffect, useRef, useState } from "react"
import { ListBox, Select } from "@heroui/react"

import {
  getDeviceModel,
  isKnownDeviceModel,
  deckDimensions,
  DECK_GAP_PX,
  type DeviceModelSpec,
} from "@/device/models"

import { token } from "virtual:sireno/token"

import { createWsClient, type WsClient, type WsStatus } from "./bridge"
import { DeckFrame } from "./DeckFrame"
import { Shell } from "./Shell"
import { BridgeLogsPage } from "./pages/BridgeLogsPage"
import { ServiceLogsPage } from "./pages/ServiceLogsPage"
import { AddonsPage, type AddonInventory } from "./pages/AddonsPage"
import { ConfigPage } from "./pages/ConfigPage"
import { DecksPage } from "./pages/DecksPage"
import { EditorPage, type EditorState } from "./pages/EditorPage"
import { AboutPage } from "./pages/AboutPage"

const ENV_WS_URL = (import.meta.env.VITE_WS_URL ??
  "ws://127.0.0.1:52937") as string
const ENV_FRONTEND_URL = (import.meta.env.VITE_FRONTEND_URL ??
  "http://127.0.0.1:5180") as string
const ENV_EMULATOR_MODE = import.meta.env.VITE_EMULATOR_MODE !== false
const ENV_DEV_MODE = import.meta.env.VITE_DEV_MODE === true
const ENV_REMOTE_MODE = import.meta.env.VITE_REMOTE_MODE === true

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
      <Select
        selectedKey={device}
        onSelectionChange={(key) => onChange(String(key))}
        aria-label="device"
        data-testid="top-device-selector"
      >
        <Select.Trigger className="min-h-8 bg-neutral-800 px-2 text-[11px]">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {VIRTUAL_DEVICE_IDS.map((id) => {
              const model = getDeviceModel(id)
              return (
                <ListBox.Item key={id} id={id} textValue={model.name}>
                  {model.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )
            })}
          </ListBox>
        </Select.Popover>
      </Select>
    </label>
  )
}

export interface AppProps {
  readonly wsUrl?: string
  readonly initialDeviceModel?: string
  readonly initialSection?: string
}

const SECTIONS = [
  "config",
  "about",
  ...(ENV_DEV_MODE
    ? (["addons", "device", "bridge-logs", "service-logs", "decks"] as const)
    : []),
] as const

const isValidSection = (s: string | null): s is (typeof SECTIONS)[number] =>
  s !== null && (SECTIONS as ReadonlyArray<string>).includes(s)

export const App = ({
  wsUrl = ENV_WS_URL,
  initialDeviceModel,
  initialSection = "config",
}: AppProps = {}): React.ReactElement => {
  const [activeSection, setActiveSection] = useState<string>(initialSection)
  const [deckOnly] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("deckOnly") === "1",
  )
  const [connectionStatus, setConnectionStatus] =
    useState<WsStatus>("connecting")
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(
    null,
  )
  const [deckScale, setDeckScale] = useState(1)
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
  const [deckTree, setDeckTree] = useState<{
    rootId: string
    decks: unknown[]
  } | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [editorResult, setEditorResult] = useState<{
    requestId: string
    ok: boolean
    error?: string
  } | null>(null)
  const [editorValidation, setEditorValidation] = useState<{
    requestId: string
    valid: boolean
    errors: string[]
  } | null>(null)
  const [deviceModel, setDeviceModel] = useState<DeviceModelSpec>(() =>
    initialDeviceModel !== undefined && isKnownDeviceModel(initialDeviceModel)
      ? getDeviceModel(initialDeviceModel)
      : DEFAULT_DEVICE_MODEL,
  )
  const [isFullscreen, setIsFullscreen] = useState(false)
  const clientRef = useRef<WsClient | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const deckContainerRef = useRef<HTMLDivElement | null>(null)
  // ponytail: ignore the first `closed` after an `open` — happens during
  // WS-replacement that some React navigations trigger. Latch only after a
  // short delay so transient reconnects don't pop the banner.
  const lastStatusRef = useRef<WsStatus | null>(null)
  const reconnectLatchTimerRef = useRef<number | null>(null)
  const disconnectedSinceRef = useRef<number | null>(null)

  useEffect(() => {
    clientRef.current = createWsClient({
      url: wsUrl,
      ...(token !== "" ? { token } : {}),
      onOpen: () => {
        clientRef.current?.send(
          JSON.stringify({ type: "editor-state-request" }),
        )
      },
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
        if (m.type === "deck-tree") {
          if (typeof m.rootId === "string" && Array.isArray(m.decks)) {
            setDeckTree({ rootId: m.rootId, decks: m.decks })
          }
        }
        if (
          m.type === "editor-state" &&
          typeof m.revision === "number" &&
          Array.isArray(m.sources)
        ) {
          setEditorState({
            revision: m.revision,
            config: m.config,
            sources: m.sources.filter(
              (source): source is string => typeof source === "string",
            ),
            sourceContents:
              m.sourceContents !== null && typeof m.sourceContents === "object"
                ? Object.fromEntries(
                    Object.entries(m.sourceContents).filter(
                      (entry): entry is [string, string] =>
                        typeof entry[0] === "string" &&
                        typeof entry[1] === "string",
                    ),
                  )
                : {},
            themes: Array.isArray(m.themes)
              ? m.themes.filter(
                  (theme): theme is { name: string; active?: boolean } =>
                    typeof theme?.name === "string",
                )
              : [],
            buttonSchemas:
              m.buttonSchemas !== null && typeof m.buttonSchemas === "object"
                ? (m.buttonSchemas as Record<string, Record<string, unknown>>)
                : {},
            canUndo: m.canUndo === true,
          })
        }
        if (
          m.type === "editor-mutation-result" &&
          typeof m.requestId === "string"
        ) {
          setEditorResult({
            requestId: m.requestId,
            ok: m.ok === true,
            ...(typeof m.error === "string" ? { error: m.error } : {}),
          })
        }
        if (
          m.type === "editor-validation-result" &&
          typeof m.requestId === "string"
        ) {
          setEditorValidation({
            requestId: m.requestId,
            valid: m.valid === true,
            errors: Array.isArray(m.errors)
              ? m.errors.filter(
                  (error): error is string => typeof error === "string",
                )
              : [],
          })
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
    return () => {
      clientRef.current?.close()
      clientRef.current = null
      if (reconnectLatchTimerRef.current !== null) {
        window.clearTimeout(reconnectLatchTimerRef.current)
        reconnectLatchTimerRef.current = null
      }
    }
  }, [wsUrl])

  useEffect(() => {
    if (disconnectedSince === null) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [disconnectedSince])

  useEffect(() => {
    const computeDeckScale = () => {
      const el = deckContainerRef.current
      if (el === null || typeof window === "undefined") return
      // Use the container's actual size (not window.innerWidth/Height) so the
      // deck scales to the visible viewport, excluding mobile browser chrome.
      const padding = 32
      const containerW = el.clientWidth - padding
      const containerH = el.clientHeight - padding
      if (containerW <= 0 || containerH <= 0) return
      const rows = Math.ceil(deviceModel.keyCount / deviceModel.columns)
      const { width, height } = deckDimensions(
        { columns: deviceModel.columns, rows },
        DECK_GAP_PX,
      )
      setDeckScale(Math.min(containerW / width, containerH / height, 1))
    }
    computeDeckScale()
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => computeDeckScale())
        : null
    if (ro !== null && deckContainerRef.current !== null) {
      ro.observe(deckContainerRef.current)
    }
    window.addEventListener("resize", computeDeckScale)
    return () => {
      ro?.disconnect()
      window.removeEventListener("resize", computeDeckScale)
    }
  }, [deviceModel])

  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash.replace(/^#\/?/, "")
    if (isValidSection(hash)) {
      setActiveSection(hash)
    }
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    const handleChange = (): void => {
      setIsFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener("fullscreenchange", handleChange)
    handleChange()
    return () => document.removeEventListener("fullscreenchange", handleChange)
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
    if (activeSection === "decks") return <DecksPage deckTree={deckTree} />
    if (activeSection === "config")
      return (
        <ConfigPage
          editor={
            <EditorPage
              wsClient={clientRef.current}
              state={editorState}
              result={editorResult}
              validation={editorValidation}
              addonInventory={addonInventory}
              frontendUrl={ENV_FRONTEND_URL}
              device={deviceModel}
              token={token}
              onGesture={sendButtonAction}
              themes={editorState?.themes}
            />
          }
        />
      )
    if (activeSection === "about") return <AboutPage />
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

  const toggleFullscreen = (): void => {
    if (typeof document === "undefined") return
    if (document.fullscreenElement !== null) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen()
    }
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
      hideSidebar={deckOnly}
      wsClient={clientRef.current}
      emulatorMode={ENV_EMULATOR_MODE}
      devMode={ENV_DEV_MODE}
      content={
        <>
          {deckOnly ? (
            <div
              ref={deckContainerRef}
              className="flex h-full w-full items-center justify-center overflow-hidden p-4"
            >
              {activeSection === "device" ? (
                deckId === "" ? (
                  <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                    Awaiting deck-config…
                  </p>
                ) : (
                  // ponytail: wrap the fixed-size deck so flexbox can't shrink
                  // it before the scale transform is applied; without shrink-0
                  // the deck is squeezed to the container width and then scaled
                  // again, making it far smaller than the intended fit.
                  <div
                    className="shrink-0"
                    style={{
                      transform: `scale(${deckScale})`,
                      transformOrigin: "center",
                    }}
                  >
                    <DeckFrame
                      frontendUrl={ENV_FRONTEND_URL}
                      device={deviceModel}
                      deckId={deckId}
                      token={token}
                      onGesture={sendButtonAction}
                      onIframeRef={(el) => {
                        iframeRef.current = el
                      }}
                    />
                  </div>
                )
              ) : (
                renderActive()
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <header
                data-testid="deck-header"
                className="flex shrink-0 items-center gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-neutral-400"
              >
                <span className="truncate text-neutral-500">
                  {deckName || "Awaiting deck-config"}
                </span>
                <span className="font-mono text-[10px] text-neutral-600">
                  #{deckId}
                </span>
                <span className="text-neutral-500">·</span>
                <span className="truncate" title={wsUrl}>
                  ws: {wsUrl}
                </span>
                <span className="text-neutral-500">·</span>
                <a
                  href={ENV_FRONTEND_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sky-400 hover:underline"
                  title={ENV_FRONTEND_URL}
                >
                  fe: {ENV_FRONTEND_URL}
                </a>
                <span className="flex-1" />
                {(ENV_EMULATOR_MODE || ENV_REMOTE_MODE) && (
                  <DeviceSelector
                    device={deviceModel.id}
                    onChange={setDevice}
                  />
                )}
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
                        token={token}
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
          )}
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
          {deckOnly && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              data-testid="fullscreen-toggle"
              className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-neutral-800/80 text-[10px] font-medium uppercase tracking-wide text-neutral-100 shadow-lg backdrop-blur hover:bg-neutral-700/80"
            >
              {isFullscreen ? "Exit" : "Full"}
            </button>
          )}
        </>
      }
      wsClient={clientRef.current}
    />
  )
}
