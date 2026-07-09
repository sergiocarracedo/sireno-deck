import { MediaPlaybackStatus } from "./domain/media-controller"

export type MediaButtonStatus =
  | MediaPlaybackStatus
  | "notAvailable"
  | "unsupported"
