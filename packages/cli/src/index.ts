export {
  BUTTON_SIZE_PX,
  DEFAULT_DEVICE_MODEL_ID,
  DEFAULT_KEY_COUNT,
  DEVICE_MODELS,
  getDeviceModel,
  gridForKeyCount,
  isKnownDeviceModel,
  resolveKeyCount,
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
  ButtonFrame,
  Chip,
  Icon,
  Label,
  TapIndicator,
  Text,
  ThemeUiPresentationProvider,
  type ButtonFrameProps,
} from "./ui"

export const cliVersion = "0.1.0"
