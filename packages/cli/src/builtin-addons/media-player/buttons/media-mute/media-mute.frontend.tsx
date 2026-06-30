import { Text } from '@/ui/index';
import { useAddonChannel } from '@/api/react';
import type { AddonFrontendButton } from '@/addon/api';
import { MediaSurface } from '../../components/MediaSurface';
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
