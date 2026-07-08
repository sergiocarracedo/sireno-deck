import type { AddonFrontendButton } from "@/addon/api";
import { useAddonChannel } from "@/api/react";

import { Icon } from "@/ui";
import type { MediaPlayerState } from "../../state";
import { MediaSurface } from "./components/MediaSurface";
import { ConfigSchema } from "./config";

const MediaPlayerButtonFrontend: AddonFrontendButton<ConfigSchema> = () => {
  const { data } = useAddonChannel<MediaPlayerState>("media:state");

  if (!data) {
    return <Icon name="hourglass" />;
  }

  return (
    <MediaSurface
      title={data?.title ?? ""}
      artist={data?.artist ?? ""}
      source={data?.source ?? ""}
      progress={data?.progress ?? 0}
      currentTime={data?.currentTime ?? 0}
      totalTime={data?.totalTime ?? 0}
      status={data?.status ?? "notAvailable"}
    />
  );
};

export default MediaPlayerButtonFrontend;
