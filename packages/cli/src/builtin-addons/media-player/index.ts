import { mediaPlayerAddon } from "./buttons/media-player.tsx";

export {
  builtinMediaPlayerButton,
  builtinMediaMuteButton,
  builtinMediaVolumeButton,
} from "./buttons/media-player.tsx";
export {
  MediaPlayerButtonSchema,
  MediaMuteButtonSchema,
  MediaVolumeButtonSchema,
} from "./schemas.ts";
export { createPoller } from "./poller.ts";

export type { MediaPlayerButtonConfig, MediaMuteButtonConfig, MediaVolumeButtonConfig } from "./schemas.ts";

export default mediaPlayerAddon;
