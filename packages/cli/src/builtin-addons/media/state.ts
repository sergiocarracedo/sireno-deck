export type MediaButtonStatus =
  | "play"
  | "pause"
  | "stop"
  | "unsupported"
  | "notAvailable";

/**
 * The wire-format for the media addon's `media:state` channel. Both the
 * backend (producer) and the frontend (consumer) import this type — there's
 * exactly one shape, not three.
 */
export interface MediaPlayerState {
  title: string | null;
  artist: string | null;
  source: string | null;
  status: MediaButtonStatus | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  totalTime: number;
  volume: number;
  muted: boolean;
}