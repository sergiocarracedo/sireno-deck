import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { token } from "virtual:sireno/token"
import {
  activeTheme,
  colorTokens,
  typography,
} from "virtual:sireno/themes/manifest"

import { ChannelRegistry } from "sireno-deck/react"
import { ThemeProvider, type ThemeContextValue } from "@/themes/index"
import {
  AssetCacheProvider,
  ThemeUiPresentationProvider,
  useAssetCacheMutations,
} from "@sireno-deck/cli"
import { createWsClient, type WsClient } from "./bridge/client"
import { WebSocketProvider, type WebSocketSend } from "./bridge/ws-context"
import { Deck } from "./components/Deck"

interface DeckButton {
  id: string
  type: string
  config: Record<string, unknown>
}

interface ButtonErrorState {
  position: number
  expiresAt: number
}

interface DeckState {
  id: string
  name: string
  buttons: DeckButton[]
  isCompact?: boolean
  hasOverlayDeckAvailable?: boolean
  buttonErrors: ButtonErrorState[]
}

const EMPTY_DECK: DeckState = {
  id: "",
  name: "",
  buttons: [],
  isCompact: undefined,
  hasOverlayDeckAvailable: false,
  buttonErrors: [],
}

const ENV_WS_URL = (import.meta.env.VITE_WS_URL ??
  "ws://127.0.0.1:52937") as string

const resolvePortFromWindow = (): number | undefined => {
  if (typeof window === "undefined") return undefined
  return (window as unknown as { __SIRENO_PORT__?: number }).__SIRENO_PORT__
}

const wsUrl = (): string => {
  const port = resolvePortFromWindow()
  if (port !== undefined) return `ws://127.0.0.1:${port}`
  return ENV_WS_URL
}

const buildThemeContext = (): ThemeContextValue => {
  if (activeTheme) {
    const manifestPath = activeTheme.manifestPath ?? ""
    const themeDir = manifestPath.replace(/\/sirenodeck\.json$/, "")
    return {
      name: activeTheme.name,
      cssPath: "",
      theme: {
        name: activeTheme.name,
        apiVersion: 3,
        source: { kind: "builtin" as const, resolvedPath: themeDir },
        manifestPath,
        uiOverridesPath: activeTheme.uiOverridesPath ?? null,
        cssPath: "",
      },
      colorTokens,
      typography,
    }
  }
  return {
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
  }
}

let _wsClientInitialized = false

export const App = () => {
  const [theme] = useState<ThemeContextValue>(() => buildThemeContext())

  return (
    <AssetCacheProvider>
      <ThemeProvider value={theme}>
        <ThemeUiPresentationProvider value={{}}>
          <AppContent />
        </ThemeUiPresentationProvider>
      </ThemeProvider>
    </AssetCacheProvider>
  )
}

const AppContent = () => {
  const [deck, setDeck] = useState<DeckState>(EMPTY_DECK)
  const [send, setSend] = useState<WebSocketSend | null>(null)
  const clientRef = useRef<WsClient | null>(null)
  const { setAsset } = useAssetCacheMutations()
  const navigate = useNavigate()

  useEffect(() => {
    if (_wsClientInitialized) return
    _wsClientInitialized = true
    const url = wsUrl()
    const client = createWsClient({
      url,
      ...(token !== "" ? { token } : {}),
      onMessage: (message) => {
        if (message.type === "assets") {
          for (const asset of message.assets) {
            setAsset(asset.id, asset.src)
          }
        }
        if (message.type === "deck-config") {
          const surface = (
            message.surfaces as Record<
              string,
              { name?: string; buttons?: DeckButton[] }
            >
          )[message.deckId]
          if (surface && Array.isArray(surface.buttons)) {
            navigate(`/decks/${message.deckId}`, { replace: true })
            setDeck({
              id: message.deckId,
              name: surface.name ?? message.deckId,
              buttons: surface.buttons,
              isCompact: message.isCompact ?? false,
              hasOverlayDeckAvailable: message.hasOverlayDeckAvailable ?? false,
              buttonErrors: [],
            })
          }
        }
        if (message.type === "button-error") {
          const position = message.position
          const durationMs = message.durationMs ?? 5000
          setDeck((previous) => ({
            ...previous,
            buttonErrors: [
              ...previous.buttonErrors.filter((error) => error.position !== position),
              { position, expiresAt: Date.now() + durationMs },
            ],
          }))
        }
        if (message.type === "state") {
          for (const [channel, payload] of Object.entries(message.channels)) {
            ChannelRegistry.instance().publish(channel, payload)
          }
        }
      },
    })
    clientRef.current = client
    setSend(() => client.send)
    client.connect()
    ChannelRegistry.setAnnounceSubscribe((channels) =>
      client.subscribeChannels(channels),
    )

    const timer = setInterval(() => {
      setDeck((previous) => {
        const now = Date.now()
        const remaining = previous.buttonErrors.filter((error) => error.expiresAt > now)
        return remaining.length === previous.buttonErrors.length
          ? previous
          : { ...previous, buttonErrors: remaining }
      })
    }, 250)

    return () => {
      _wsClientInitialized = false
      ChannelRegistry.setAnnounceSubscribe(null)
      setSend(null)
      client.close()
      clearInterval(timer)
    }
  }, [setAsset, navigate])

  return (
    <WebSocketProvider value={send}>
      <main className="bg-bg text-fg flex min-h-screen items-center justify-center">
        <Deck deck={deck} />
      </main>
    </WebSocketProvider>
  )
}
