import type { Message } from '../../../src/render/protocol';
import type { DeviceLayout } from './devices';

export function attachMouseEmulation(opts: {
  overlayEl: HTMLElement;
  iframeEl: HTMLIFrameElement;
  device: DeviceLayout;
  send: (msg: Message) => void;
  onAction?: (msg: Message) => void;
}): () => void {
  const { overlayEl, iframeEl, device, send, onAction } = opts;

  const handler = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = iframeEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return;
    const col = Math.floor(x / (device.keyWidth + 8));
    const row = Math.floor(y / (device.keyHeight + 8));
    if (col < 0 || col >= device.cols || row < 0 || row >= device.rows) return;
    const keyIndex = row * device.cols + col;
    const action = e.type === 'mousedown' ? 'down' : 'up';
    const msg: Message = {
      protocolVersion: 1 as const,
      type: 'button-action',
      keyIndex,
      action,
      at: Date.now(),
    };
    send(msg);
    onAction?.(msg);
  };

  const onDown = (e: MouseEvent) => handler(e);
  const onUp = (e: MouseEvent) => handler(e);
  overlayEl.addEventListener('mousedown', onDown);
  overlayEl.addEventListener('mouseup', onUp);
  return () => {
    overlayEl.removeEventListener('mousedown', onDown);
    overlayEl.removeEventListener('mouseup', onUp);
  };
}