import { useEffect, useState, type CSSProperties } from 'react';
import { SUPPORTED_DEVICES, type DeviceLayout, deviceSize } from './devices';
import { attachMouseEmulation } from './mouse-to-button';
import type { Message } from '../../../src/render/protocol';

export interface IframeCanvasProps {
  deckUrl: string;
  wsUrl: string;
  device: DeviceLayout;
  send: (msg: Message) => void;
  onAction?: (msg: Message) => void;
}

export function IframeCanvas({ deckUrl, wsUrl, device, send, onAction }: IframeCanvasProps) {
  const size = deviceSize(device);
  const [overlayRef, setOverlayRef] = useState<HTMLDivElement | null>(null);
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!overlayRef || !iframeRef) return;
    return attachMouseEmulation({
      overlayEl: overlayRef,
      iframeEl: iframeRef,
      device,
      send,
      onAction,
    });
  }, [overlayRef, iframeRef, device, send, onAction]);

  const iframeSrc = `${deckUrl.replace(/\/$/, '')}/?ws=${encodeURIComponent(wsUrl)}&mode=emulate&device=${encodeURIComponent(device.name)}`;

  return (
    <div style={{ ...frameStyle, width: size.width + 16, height: size.height + 16 }}>
      <iframe
        ref={setIframeRef}
        src={iframeSrc}
        style={iframeStyle}
        title="emulated deck"
      />
      <div ref={setOverlayRef} style={overlayStyle} />
    </div>
  );
}

const frameStyle: CSSProperties = {
  position: 'relative',
  padding: 8,
  background: 'var(--sireno-card, #222)',
  borderRadius: 8,
  border: '1px solid var(--sireno-border, #444)',
};

const iframeStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  borderRadius: 4,
  pointerEvents: 'none',
  display: 'block',
};

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 8,
  cursor: 'pointer',
  borderRadius: 4,
};

export { SUPPORTED_DEVICES };