export function App() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--sireno-surface, #1a1a1a)',
        color: 'var(--sireno-text, #f5f5f5)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          padding: '24px 32px',
          borderRadius: 8,
          border: '2px solid var(--sireno-accent, #4a9eff)',
          background: 'var(--sireno-card, #222)',
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}
      >
        Phase 75.1-01
      </div>
    </div>
  );
}