export {
  BUTTON_SIZE_PX,
  DECK_GAP_PX,
  DECK_PADDING_PX,
  DEFAULT_DEVICE_MODEL_ID,
  DEFAULT_KEY_COUNT,
  DEVICE_MODELS,
  deckDimensions,
  getDeviceModel,
  gridForKeyCount,
  isKnownDeviceModel,
  resolveKeyCount,
  resolveDeckGap,
  type DeviceModelSpec,
} from "./device/models"
export {
  PACKAGE_NAME,
  PROTOCOL_VERSION,
  SIRENO_ADDON_API_VERSION,
} from "./version"

export {
  DOUBLE_TAP_DELAY_MS,
  HOLD_ACTION_DELAY_MS,
  SPA_DOUBLE_TAP_DELAY_MS,
  SPA_HOLD_DELAY_MS,
  nextGesture,
  type GestureEvent,
  type GestureKind,
  type GestureResult,
  type GestureType,
  createGestureDetector,
  type GestureDetector,
} from "./core/gesture-state"

export type { AddonGestureEvent } from "./addon/api"

export { ChannelRegistry } from "./api/react/registry"
export {
  useAddonChannel,
  type UseAddonChannelReturn,
} from "./api/react/use-addon-channel"
export {
  ThemeContext,
  ThemeProvider,
  useTheme,
  type ThemeContextValue,
} from "./themes/use-resolved-theme"

export {
  AssetCacheProvider,
  useAssetCache,
  useAssetCacheMutations,
  type AssetCache,
  buildPresentation,
  ButtonFrame,
  Chip,
  Icon,
  IconLabelSurface,
  Label,
  SplitActionSurface,
  TapIndicator,
  TemporaryErrorSurface,
  Text,
  ThemeUiPresentationProvider,
  type ButtonFrameProps,
  type IconLabelSurfaceProps,
  type SplitActionSurfaceProps,
  type TapIndicatorProps,
  type TemporaryErrorSurfaceProps,
  type ThemeUiPresentation,
} from "./ui"

export const cliVersion = "0.1.0"
