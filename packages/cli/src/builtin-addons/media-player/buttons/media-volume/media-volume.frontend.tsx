import { Text } from '@/ui/index';
import { useAddonChannel } from '@/api/react';
import type { AddonFrontendButton } from '@/addon/api';
import { MediaSurface } from '../../components/MediaSurface';
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
