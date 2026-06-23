import { useEffect, useState } from "react";
import { token } from "virtual:sireno/token";
import { Deck } from "./components/Deck.tsx";

interface MockButton {
  id: string;
  type: string;
  label: string;
  config: { deck?: string };
}

const MOCK_DECK: { id: string; name: string; buttons: MockButton[] } = {
  id: "main",
  name: "Home",
  buttons: [
    { id: "b0", type: "core:change-deck", label: "Media", config: { deck: "media" } },
    { id: "b1", type: "core:action", label: "Run", config: { command: "echo hello" } },
    { id: "b2", type: "core:toggle", label: "Toggle", config: { key: "demo" } },
  ],
};

export const App = () => {
  const [deck, setDeck] = useState(MOCK_DECK);

  useEffect(() => {
    if (token === "") return;
    void token;
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <header className="text-sm uppercase tracking-widest text-neutral-500">
        {deck.name} · ws: {token === "" ? "dev" : "authed"}
      </header>
      <Deck deck={deck} onNavigate={setDeck} />
    </main>
  );
};

void MOCK_DECK;
