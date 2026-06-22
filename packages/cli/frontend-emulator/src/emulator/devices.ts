export interface DeviceLayout {
  keyWidth: number;
  keyHeight: number;
  cols: number;
  rows: number;
  name: string;
}

export const SUPPORTED_DEVICES: DeviceLayout[] = [
  { keyWidth: 72, keyHeight: 72, cols: 3, rows: 1, name: '3-key' },
  { keyWidth: 72, keyHeight: 72, cols: 6, rows: 1, name: '6-key' },
  { keyWidth: 72, keyHeight: 72, cols: 5, rows: 3, name: '15-key' },
  { keyWidth: 72, keyHeight: 72, cols: 8, rows: 4, name: '32-key' },
];

export function deviceByName(name: string | null): DeviceLayout {
  return SUPPORTED_DEVICES.find((d) => d.name === name) ?? SUPPORTED_DEVICES[2];
}

export function deviceSize(device: DeviceLayout): { width: number; height: number } {
  return {
    width: device.cols * device.keyWidth + (device.cols - 1) * 8,
    height: device.rows * device.keyHeight + (device.rows - 1) * 8,
  };
}