import { useEffect, useState } from "react";
import { token } from "virtual:sireno/token";

import { ChannelRegistry } from "sireno-deck-2/react";
import { createWsClient } from "./bridge/client.ts";
import { Deck } from "./components/Deck.tsx";

interface MockButton {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

const MOCK_DECK = {
  id: "main",
  name: "Home",
  buttons: [
    { id: "b0", type: "core:change-deck", label: "Media", config: { deck: "media" } },
    { id: "b1", type: "core:action", label: "Run", config: { command: "echo hi" } },
  ] as MockButton[],
};

const wsUrl = (): string => {
  if (typeof window === "undefined") return "ws://127.0.0.1:0";
  const port = (window as unknown as { __SIRENO_PORT__?: number }).__SIRENO_PORT__;
  return port !== undefined ? `ws://127.0.0.1:${port}` : "ws://127.0.0.1:0";
};

export const App = () => {
  const [deck, setDeck] = useState(MOCK_DECK);

  useEffect(() => {
    const url = wsUrl();
    const client = createWsClient({
      url,
      ...(token !== "" ? { token } : {}),
      onMessage: (message) => {
        if (message.type === "deck-config") {
          const surfaces = message.surfaces as Record<string, { buttons?: MockButton[] }>;
          const buttons = surfaces["buttons"];
          if (Array.isArray(buttons)) {
            setDeck((prev) => ({ ...prev, buttons }));
          }
        }
        if (message.type === "state") {
          for (const [channel, payload] of Object.entries(message.channels)) {
            ChannelRegistry.instance().publish(channel, payload);
          }
        }
      },
    });
    client.connect();
    return () => client.close();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <header className="text-sm uppercase tracking-widest text-neutral-500">
        {deck.name} · ws: {token === "" ? "dev" : "authed"}
      </header>
      <Deck
        deck={deck}
        onNavigate={() => {
          /* wired via deck-config */
        }}
        onAction={(buttonId) => {
          ChannelRegistry.instance().publish("runtime:button-tap", { buttonId });
        }}
      />
    </main>
  );
};
