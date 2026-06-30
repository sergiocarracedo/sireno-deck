import type { AddonFrontendButton } from "@/addon/api";
import { useAddonChannel } from "@/api/react";

import { MediaSurface } from "../../components/MediaSurface";

interface MediaState {
  title?: string;
  artist?: string;
  source?: string;
  progress?: number;
  time?: string;
  status?: "play" | "pause" | "stop" | "unsupported" | "notAvailable";
  isPlaying?: boolean;
}

const MediaPlayerButtonFrontend: AddonFrontendButton = () => {
  const { data } = useAddonChannel<MediaState>("media-player:state");
  if (data) {
    return (
      <MediaSurface
        title={data.title ?? ""}
        artist={data.artist ?? ""}
        source={data.source ?? ""}
        progress={data.progress ?? 0}
        time={data.time ?? ""}
        status={data.status ?? (data.isPlaying ? "play" : "pause")}
      />
    );
  }
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1">
      <span className="text-md text-muted">No media</span>
    </span>
  );
};

export default MediaPlayerButtonFrontend;