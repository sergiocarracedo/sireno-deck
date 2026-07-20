import { useEffect, useRef, useState } from "react"

import {
  ChannelRegistry,
  Deck,
  ThemeProvider,
  type ThemeContextValue,
  type DeckButton,
} from "@sireno-deck/cli"

import { createWsClient, serializeHello, type WsClient, type WsStatus } from "./bridge"
import { Shell } from "./Shell"
import { BridgeLogsPage } from "./pages/BridgeLogsPage"
import { ServiceLogsPage } from "./pages/ServiceLogsPage"
import { AddonsPage } from "./pages/AddonsPage"
import { ConfigPage } from "./pages/ConfigPage"
import { DevicePage } from "./pages/DevicePage"

let _wsClientInitialized = false

interface DeckState {
  id: string
  name: string
  buttons: DeckButton[]
}

const EMPTY_DECK: DeckState = {
  id: "",
  name: "",
  buttons: [],
}

const ENV_WS_URL = (import.meta.env.VITE_WS_URL ??
  "ws://127.0.0.1:52937") as string

const buildThemeContext = (): ThemeContextValue => ({
  name: "default",
  cssPath: "",
  theme: {
    name: "default",
    apiVersion: 3,
    source: { kind: "builtin" as const, resolvedPath: "" },
    manifestPath: "",
    uiOverridesPath: null,
    cssPath: "",
  },
  colorTokens: null,
  typography: null,
})

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
  initialSection = "device",
}: AppProps = {}): React.ReactElement => {
  const [deck, setDeck] = useState<DeckState>(EMPTY_DECK)
  const [activeSection, setActiveSection] = useState<string>(initialSection)
  const [connectionStatus, setConnectionStatus] = useState<WsStatus>("connecting")
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const theme = useState<ThemeContextValue>(() => buildThemeContext())[0]
  const clientRef = useRef<WsClient | null>(null)

  useEffect(() => {
    if (_wsClientInitialized) return
    _wsClientInitialized = true
    clientRef.current = createWsClient({
      url: wsUrl,
      onStatus: (status) => {
        setConnectionStatus(status)
        setAttempt(clientRef.current?.attemptCount() ?? 0)
        if (status === "open") {
          setDisconnectedSince(null)
        } else {
          setDisconnectedSince((previous) =>
            previous === null ? Date.now() : previous,
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
      onMessage: (message: unknown) => {
        const m = message as {
          type?: string
          surfaces?: unknown
          channels?: unknown
        }
        if (
          m.type === "deck-config" &&
          typeof m.surfaces === "object" &&
          m.surfaces !== null
        ) {
          const surfaces = m.surfaces as Record<
            string,
            { buttons?: unknown; id?: string; name?: string }
          >
          const surface = surfaces["buttons"] ?? surfaces["main"]
          if (surface && Array.isArray(surface.buttons)) {
            setDeck({
              id: surface.id ?? "main",
              name: surface.name ?? "Home",
              buttons: surface.buttons as DeckButton[],
            })
          }
        }
        if (
          m.type === "state" &&
          typeof m.channels === "object" &&
          m.channels !== null
        ) {
          for (const [channel, payload] of Object.entries(m.channels)) {
            ChannelRegistry.instance().publish(channel, payload)
          }
        }
        if (typeof m.type === "string" && m.type.endsWith("error")) {
          setLastError(String(m.type))
        }
      },
    })
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => {
      _wsClientInitialized = false
      clearInterval(timer)
      clientRef.current?.close()
      clientRef.current = null
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
    if (activeSection === "addons") return <AddonsPage />
    if (activeSection === "config") return <ConfigPage />
    return (
      <DevicePage
        wsUrl={wsUrl}
      />
    )
  }

  const sendButtonAction = (
    buttonId: string,
    gesture: "tap" | "dbl-tap" | "hold",
  ): void => {
    const button = deck.buttons.find((b) => b.id === buttonId)
    if (button === undefined) return
    const position =
      typeof button.position === "number" && Number.isFinite(button.position)
        ? button.position
        : deck.buttons.indexOf(button)
    clientRef.current?.send(
      JSON.stringify({
        type: "button-action",
        deckId: deck.id,
        position,
        gesture,
      }),
    )
  }

  const sendNavigate = (deckId: string): void => {
    clientRef.current?.send(JSON.stringify({ type: "select-deck", deckId }))
    ChannelRegistry.instance().publish("runtime:navigate", { deckId })
  }

  const elapsed = disconnectedSince === null ? 0 : now - disconnectedSince
  const showBsod =
    connectionStatus !== "open" && disconnectedSince !== null && elapsed >= 30000
  const showBanner =
    connectionStatus !== "open" && disconnectedSince !== null && elapsed < 30000
  void lastError

  return (
    <ThemeProvider value={theme}>
      <Shell
        activeSection={activeSection}
        onSelect={onSelect}
        content={
          <div className="flex h-full flex-col">
            <header className="border-b border-neutral-800 bg-neutral-950 px-4 py-2 font-mono text-xs uppercase tracking-widest text-neutral-400">
              {deck.name} · ws: {wsUrl}
            </header>
            <div className="flex flex-1 overflow-hidden">
              <aside className="w-44 shrink-0 border-r border-neutral-800 p-3 overflow-y-auto">
                <DevicePage wsUrl={wsUrl} />
              </aside>
              <section className="flex-1 overflow-auto p-4">
                {activeSection === "device" ? (
                  deck.buttons.length === 0 ? (
                    <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                      Awaiting deck-config…
                    </p>
                  ) : (
                    <Deck
                      deck={{
                        id: deck.id,
                        name: deck.name,
                        buttons: deck.buttons,
                      }}
                      onAction={sendButtonAction}
                      onNavigate={sendNavigate}
                    />
                  )
                ) : (
                  renderActive()
                )}
              </section>
            </div>
          </div>
        }
        wsClient={clientRef.current}
      />
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
              <div className="flex justify-between">
                <dt className="text-neutral-500">Elapsed</dt>
                <dd className="font-mono text-neutral-200">
                  {Math.floor(elapsed / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(Math.floor(elapsed / 1000) % 60)
                    .toString()
                    .padStart(2, "0")}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </ThemeProvider>
  )
}
