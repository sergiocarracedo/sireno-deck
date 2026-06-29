import { brightnessAddon } from "./buttons/brightness";

export { builtinBrightnessButton } from "./buttons/brightness";
export { BrightnessButtonSchema } from "./schemas";
export { buildMacOSCommand, formatCommand, isMacOS, setBrightnessMacOS } from "./domain/macos";
export { createPoller } from "./poller";
export type { BrightnessButtonConfig } from "./schemas";

export default brightnessAddon;
