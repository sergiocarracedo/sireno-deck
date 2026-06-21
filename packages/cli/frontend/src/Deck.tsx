import { useEffect, useMemo, useState, type ComponentType } from 'react';
import type { DeckConfigMessage, SurfaceSpec } from '../../src/render/protocol';
import DateTimeFrontend from '../../src/builtin-addons/date-time/frontend';

type AddonFrontendMap = Record<string, ComponentType<{ spec: SurfaceSpec }>>;

const BUILTIN_ADDON_FRONTENDS: AddonFrontendMap = {
  'date-time': DateTimeFrontend,
};

async function loadAddonFrontends(
  surfaces: Record<string, SurfaceSpec>,
): Promise<AddonFrontendMap> {
  const map: AddonFrontendMap = {};
  for (const spec of Object.values(surfaces)) {
    const Component = BUILTIN_ADDON_FRONTENDS[spec.addonName];
    if (Component) map[spec.addonName] = Component;
    else
      // eslint-disable-next-line no-console
      console.warn(`[deck] no builtin frontend registered for addon '${spec.addonName}'`);
  }
  return map;
}

function getKeyIndex(keyId: string): number {
  const m = /^key-(\d+)$/.exec(keyId);
  return m ? parseInt(m[1]!, 10) : -1;
}

export interface DeckProps {
  deckConfig: DeckConfigMessage;
}

export function Deck({ deckConfig }: DeckProps) {
  const [frontends, setFrontends] = useState<AddonFrontendMap>({});

  useEffect(() => {
    let cancelled = false;
    loadAddonFrontends(deckConfig.surfaces).then((map) => {
      if (!cancelled) setFrontends(map);
    });
    return () => {
      cancelled = true;
    };
  }, [deckConfig]);

  const keyEntries = useMemo(() => {
    return Object.entries(deckConfig.surfaces)
      .map(([keyId, spec]) => ({ keyId, keyIndex: getKeyIndex(keyId), spec }))
      .filter((e) => e.keyIndex >= 0)
      .sort((a, b) => a.keyIndex - b.keyIndex);
  }, [deckConfig]);

  const missing = keyEntries.filter((e) => !frontends[e.spec.addonName]);

  if (missing.length > 0 && Object.keys(frontends).length === 0) {
    return (
      <div style={loadingStyle}>
        loading addon frontends ({missing.length} pending)…
      </div>
    );
  }

  return (
    <div
      data-sireno-deck="true"
      data-deck-id={deckConfig.deckId}
      data-nav-mode={deckConfig.navMode}
      style={deckGridStyle}
    >
      {keyEntries.map(({ keyId, spec }) => {
        const Component = frontends[spec.addonName];
        return (
          <div
            key={keyId}
            data-sireno-key={keyId}
            data-addon={spec.addonName}
            data-button-type={spec.buttonType}
            style={keySlotStyle}
          >
            {Component ? (
              <Component spec={spec} />
            ) : (
              <div style={missingStyle}>{spec.buttonType}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const deckGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 72px)',
  gridTemplateRows: 'repeat(3, 72px)',
  gap: '8px',
  padding: '16px',
  background: 'var(--sireno-surface, #1a1a1a)',
};

const keySlotStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 8,
  border: '1px solid var(--sireno-border, #444)',
  background: 'var(--sireno-card, #222)',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const loadingStyle: React.CSSProperties = {
  padding: 24,
  color: 'var(--sireno-text, #999)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
};

const missingStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--sireno-text-muted, #888)',
  fontFamily: 'system-ui, sans-serif',
};