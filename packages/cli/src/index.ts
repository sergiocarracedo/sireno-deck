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

export const cliVersion = "0.1.0";
