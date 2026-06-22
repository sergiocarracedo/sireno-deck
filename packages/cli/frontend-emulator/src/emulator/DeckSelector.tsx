import type { CSSProperties } from 'react';

export interface DeckSummary {
  id: string;
  name: string;
}

export interface DeckSelectorProps {
  decks: readonly DeckSummary[];
  current: string | null;
  onChange: (deckId: string) => void;
}

export function DeckSelector({ decks, current, onChange }: DeckSelectorProps) {
  if (decks.length === 0) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>deck:</span>
        <span style={emptyStyle}>(awaiting decks-list from CLI)</span>
      </div>
    );
  }
  return (
    <div style={containerStyle}>
      <span style={labelStyle}>deck:</span>
      {decks.map((d) => (
        <button
          key={d.id}
          onClick={() => onChange(d.id)}
          style={{
            ...buttonStyle,
            background: d.id === current ? 'var(--sireno-accent, #4a9eff)' : 'transparent',
            color: d.id === current ? '#fff' : 'var(--sireno-text, #f5f5f5)',
          }}
        >
          {d.name}
        </button>
      ))}
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
};

const labelStyle: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  color: 'var(--sireno-text, #f5f5f5)',
};

const emptyStyle: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  fontStyle: 'italic',
  color: 'var(--sireno-text-muted, #888)',
};

const buttonStyle: CSSProperties = {
  padding: '4px 12px',
  border: '1px solid var(--sireno-border, #444)',
  borderRadius: 4,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  cursor: 'pointer',
};
