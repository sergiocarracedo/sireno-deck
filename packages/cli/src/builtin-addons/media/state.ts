export type MediaButtonStatus =
  | "play"
  | "pause"
  | "stop"
  | "unsupported"
  | "notAvailable";

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