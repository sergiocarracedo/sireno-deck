import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { token } from "virtual:sireno/token";
import { activeTheme, colorTokens, typography } from "virtual:sireno/themes/manifest";

import { ChannelRegistry } from "sireno-deck/react";
import { ThemeProvider, type ThemeContextValue } from "@/themes/index";
import {
  AssetCacheProvider,
  ThemeUiPresentationProvider,
  useAssetCacheMutations,
} from "@sireno-deck/cli";
import { createWsClient, type WsClient } from "./bridge/client";
import { Deck, type ButtonGestureMap, type ButtonGestureState } from "./components/Deck";

interface DeckButton {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface DeckState {
  id: string;
  name: string;
  buttons: DeckButton[];
}

const EMPTY_DECK: DeckState = {
  id: "",
  name: "",
  buttons: [],
};

const EMPTY_GESTURE: ButtonGestureState = {
  pressed: false,
  isTapping: false,
  isHolding: false,
  holdProgress: 0,
};

const ENV_WS_URL = (import.meta.env.VITE_WS_URL ?? "ws://127.0.0.1:52937") as string;

const resolvePortFromWindow = (): number | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { __SIRENO_PORT__?: number }).__SIRENO_PORT__;
};

const wsUrl = (): string => {
  const port = resolvePortFromWindow();
  if (port !== undefined) return `ws://127.0.0.1:${port}`;
  return ENV_WS_URL;
};

const buildThemeContext = (): ThemeContextValue => {
  if (activeTheme) {
    const manifestPath = activeTheme.manifestPath ?? "";
    const themeDir = manifestPath.replace(/\/sirenodeck\.json$/, "");
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
    };
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
  };
};

let _wsClientInitialized = false;

export const App = () => {
  const [theme] = useState<ThemeContextValue>(() => buildThemeContext());

  return (
    <AssetCacheProvider>
      <ThemeProvider value={theme}>
        <ThemeUiPresentationProvider value={{}}>
          <AppContent />
        </ThemeUiPresentationProvider>
      </ThemeProvider>
    </AssetCacheProvider>
  );
};

const AppContent = () => {
  const [deck, setDeck] = useState<DeckState>(EMPTY_DECK);
  const [gestures, setGestures] = useState<ButtonGestureMap>({});
  const clientRef = useRef<WsClient | null>(null);
  const { setAsset } = useAssetCacheMutations();
  const navigate = useNavigate();

  useEffect(() => {
    if (_wsClientInitialized) return;
    _wsClientInitialized = true;
    const url = wsUrl();
    const client = createWsClient({
      url,
      ...(token !== "" ? { token } : {}),
      onMessage: (message) => {
        if (message.type === "assets") {
          for (const asset of message.assets) {
            setAsset(asset.id, asset.data);
          }
        }
        if (message.type === "deck-config") {
          const surface = (
            message.surfaces as Record<string, { name?: string; buttons?: DeckButton[] }>
          )[message.deckId];
          if (surface && Array.isArray(surface.buttons)) {
            navigate(`/decks/${message.deckId}`, { replace: true });
            setDeck({
              id: message.deckId,
              name: surface.name ?? message.deckId,
              buttons: surface.buttons,
            });
          }
        }
        if (message.type === "button-action") {
          const buttonId = String(message.position);
          const gesture = message.gesture;
          setGestures((prev) => {
            const next: Record<string, ButtonGestureState> = { ...prev };
            if (gesture === "hold") {
              next[buttonId] = {
                pressed: true,
                isTapping: false,
                isHolding: true,
                holdProgress: 1,
              };
            } else {
              next[buttonId] = {
                pressed: true,
                isTapping: true,
                isHolding: false,
                holdProgress: 0,
              };
            }
            return next;
          });
        }
        if (message.type === "state") {
          for (const [channel, payload] of Object.entries(message.channels)) {
            ChannelRegistry.instance().publish(channel, payload);
          }
        }
      },
    });
    clientRef.current = client;
    client.connect();
    ChannelRegistry.setAnnounceSubscribe((channels) => client.subscribeChannels(channels));
    return () => {
      _wsClientInitialized = false;
      ChannelRegistry.setAnnounceSubscribe(null);
      client.close();
    };
  }, [setAsset]);

  const sendButtonAction = (buttonId: string, gesture: "tap" | "dbl-tap" | "hold"): void => {
    const button = deck.buttons.find((b) => b.id === buttonId);
    if (button === undefined) return;
    const position =
      typeof button.position === "number" && Number.isFinite(button.position)
        ? button.position
        : deck.buttons.indexOf(button);
    clientRef.current?.send(
      JSON.stringify({
        type: "button-action",
        deckId: deck.id,
        position,
        gesture,
      }),
    );
  };

  const gestureMap: ButtonGestureMap = Object.fromEntries(
    deck.buttons.map((b) => [b.id, gestures[b.id] ?? EMPTY_GESTURE]),
  );

  return (
    <main className="bg-bg text-fg flex min-h-screen items-center justify-center">
      <Deck deck={deck} gestures={gestureMap} onAction={sendButtonAction} />
    </main>
  );
};
