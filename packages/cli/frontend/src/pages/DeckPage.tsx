import { useOutletContext } from 'react-router-dom';
import type { DeckConfigMessage } from '../../../src/render/protocol';
import { Deck } from '../Deck';

interface DeckPageContext {
  deck: DeckConfigMessage | null;
}

export function DeckPage() {
  const { deck } = useOutletContext<DeckPageContext>();
  if (!deck) {
    return (
      <div style={loadingStyle}>
        no deck-config received yet (try navigating back to /)
      </div>
    );
  }
  return <Deck deckConfig={deck} />;
}

const loadingStyle: React.CSSProperties = {
  padding: 24,
  color: 'var(--sireno-text, #999)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
};