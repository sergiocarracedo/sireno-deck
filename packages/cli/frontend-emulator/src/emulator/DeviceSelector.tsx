import type { CSSProperties } from 'react';
import { SUPPORTED_DEVICES, type DeviceLayout } from './devices';

export interface DeviceSelectorProps {
  current: DeviceLayout;
  onChange: (device: DeviceLayout) => void;
}

export function DeviceSelector({ current, onChange }: DeviceSelectorProps) {
  return (
    <div style={containerStyle}>
      <span style={labelStyle}>device:</span>
      {SUPPORTED_DEVICES.map((d) => (
        <button
          key={d.name}
          onClick={() => onChange(d)}
          style={{
            ...buttonStyle,
            background: d.name === current.name ? 'var(--sireno-accent, #4a9eff)' : 'transparent',
            color: d.name === current.name ? '#fff' : 'var(--sireno-text, #f5f5f5)',
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

const buttonStyle: CSSProperties = {
  padding: '4px 12px',
  border: '1px solid var(--sireno-border, #444)',
  borderRadius: 4,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  cursor: 'pointer',
};