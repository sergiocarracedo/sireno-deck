import { useEffect, useRef, useState } from "react"
import {
  ChannelRegistry,
  Deck,
  ThemeProvider,
  type ThemeContextValue,
  type DeckButton,
} from "@sireno-deck/cli"

import { createWsClient, serializeHello, type WsClient, type WsStatus } from "./bridge"
import { ReconnectingBanner } from "./components/ReconnectingBanner"
import { DisconnectedOverlay } from "./components/DisconnectedOverlay"

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
}

export const App = ({
  wsUrl = ENV_WS_URL,
}: AppProps = {}): React.ReactElement => {
  const [deck, setDeck] = useState<DeckState>(EMPTY_DECK)
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
    const client: WsClient = createWsClient({
      url: wsUrl,
      onStatus: (status) => {
        setConnectionStatus(status)
        setAttempt(client.attemptCount())
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
      },
    })
    clientRef.current = client
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => {
      _wsClientInitialized = false
      clearInterval(timer)
      client.close()
    }
  }, [wsUrl])

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

  return (
    <ThemeProvider value={theme}>
      <main className="bg-bg text-fg flex min-h-screen flex-col items-center gap-4 p-6">
        <ReconnectingBanner
          status={connectionStatus}
          disconnectedSince={disconnectedSince}
          attempt={attempt}
          now={now}
        />
        <header className="font-mono text-xs uppercase tracking-widest text-muted">
          {deck.name} · ws: {wsUrl}
        </header>
        {deck.buttons.length === 0 ? (
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
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
        )}
        <DisconnectedOverlay
          status={connectionStatus}
          disconnectedSince={disconnectedSince}
          attempt={attempt}
          lastError={lastError}
          now={now}
        />
      </main>
    </ThemeProvider>
  )
}
