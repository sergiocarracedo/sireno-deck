export interface RenderPreset {
  keyWidth: number
  keyHeight: number
  background: string
  frame: string
  text: string
  gap: number
}

export const STREAM_DECK_KEY_PRESET: RenderPreset = {
  keyWidth: 72,
  keyHeight: 72,
  gap: 8,
  background: '#0f1720',
  frame: '#2a3647',
  text: '#f4f7fb',
}
