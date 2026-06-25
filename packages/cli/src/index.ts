export { PACKAGE_NAME, PROTOCOL_VERSION, SIRENO_ADDON_API_VERSION } from "./version";
export {
  DEFAULT_DEVICE_MODEL_ID,
  DEFAULT_KEY_COUNT,
  DEVICE_MODELS,
  getDeviceModel,
  gridForKeyCount,
  isKnownDeviceModel,
  resolveKeyCount,
  type DeviceModelSpec,
} from "./device/models.ts";
export {
  DOUBLE_TAP_DELAY_MS,
  HOLD_ACTION_DELAY_MS,
  nextGesture,
  type GestureEvent,
  type GestureKind,
  type GestureResult,
  type GestureType,
} from "./core/gesture-state.ts";
export { Deck, type DeckButton, type Deck as DeckType, type DeckProps } from "./components/Deck.tsx";
export { ButtonFrame, type ButtonFrameProps } from "./components/ButtonFrame.tsx";
export { ThemeProvider, useTheme, ThemeContext, type ThemeContextValue } from "./themes/use-resolved-theme.tsx";
export { ChannelRegistry } from "./react/registry.ts";

export const cliVersion = "0.1.0";
