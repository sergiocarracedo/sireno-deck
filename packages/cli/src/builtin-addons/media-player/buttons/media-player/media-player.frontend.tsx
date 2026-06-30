import { Text } from '@/ui/index';
import { useAddonChannel } from '@/api/react';
import type { AddonFrontendButton } from '@/addon/api';
import { MediaSurface } from '../../components/MediaSurface';
export const MediaPlayerButtonFrontend: AddonFrontendButton = () => {
  const { data } = useAddonChannel<MediaState>('media-player:state');
  if (data) {
    return (
      <MediaSurface
        title={data.title ?? ''}
        artist={data.artist ?? ''}
        source={data.source ?? ''}
        progress={data.progress ?? 0}
        time={data.time ?? ''}
        status={data.status ?? (data.isPlaying ? 'play' : 'pause')}
      />
    );
  }
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1">
      <Text size="md" tone="muted" typography="main">
        No media
      </Text>
    </span>
  );
};
