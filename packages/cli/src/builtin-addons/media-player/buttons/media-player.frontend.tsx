import { Text } from '@/ui/index';
import { useAddonChannel } from '@/api/react';
import type { AddonFrontendButton } from '@/addon/api';

import { MediaSurface } from '../components/MediaSurface';

interface MediaState {
  readonly title: string | null;
  readonly artist: string | null;
  readonly source?: string | null;
  readonly isPlaying: boolean;
  readonly volume: number;
  readonly canGoNext: boolean;
  readonly canGoPrev: boolean;
  readonly progress?: number;
  readonly time?: string;
  readonly status?: 'play' | 'pause' | 'stop' | null;
}

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

export const MediaMuteButtonFrontend: AddonFrontendButton = () => (
  <span className="flex h-full w-full flex-col items-center justify-center gap-1">
    <Text size="3xl" tone="primary" typography="main">
      🔇
    </Text>
    <Text size="xs" tone="fg" typography="aux">
      Mute
    </Text>
  </span>
);

export const MediaVolumeButtonFrontend: AddonFrontendButton = ({ config }) => {
  const direction = (config as { direction?: 'up' | 'down' }).direction ?? 'up';
  const glyph = direction === 'down' ? '🔉' : '🔊';
  const label = direction === 'down' ? 'Vol -' : 'Vol +';
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1">
      <Text size="3xl" tone="primary" typography="main">
        {glyph}
      </Text>
      <Text size="xs" tone="fg" typography="aux">
        {label}
      </Text>
    </span>
  );
};
