import { mediaPlayerAddon } from "./buttons/media-player";

export {
  builtinMediaPlayerButton,
  builtinMediaMuteButton,
  builtinMediaVolumeButton,
} from "./buttons/media-player";
export {
  MediaPlayerButtonSchema,
  MediaMuteButtonSchema,
  MediaVolumeButtonSchema,
} from "./schemas";
export { createPoller } from "./poller";

export type { MediaPlayerButtonConfig, MediaMuteButtonConfig, MediaVolumeButtonConfig } from "./schemas";

export default mediaPlayerAddon;
