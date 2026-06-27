import { brightnessAddon } from "./buttons/brightness.tsx";

export { builtinBrightnessButton } from "./buttons/brightness.tsx";
export { BrightnessButtonSchema } from "./schemas.ts";
export { buildMacOSCommand, formatCommand, isMacOS, setBrightnessMacOS } from "./domain/macos.ts";
export { createPoller } from "./poller.ts";
export type { BrightnessButtonConfig } from "./schemas.ts";

export default brightnessAddon;
