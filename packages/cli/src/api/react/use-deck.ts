import { useEffect, useState } from "react";

import { ChannelRegistry } from "./registry.ts";

export interface UseDeckReturn {
  activeDeckId: string | null;
}

export const useDeck = (): UseDeckReturn => {
  const [activeDeckId, setActiveDeckId] = useState<string | null>(
    () => ChannelRegistry.instance().last<string>("runtime:activeDeck") ?? null,
  );

  useEffect(() => {
    return ChannelRegistry.instance().subscribe<{ deckId: string }>(
      "runtime:activeDeck",
      (payload) => {
        setActiveDeckId(payload.deckId);
      },
    );
  }, []);

  return { activeDeckId };
};
