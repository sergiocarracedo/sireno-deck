import { Text } from "@sireno-deck-2/cli";
import { useAddonChannel } from "sireno-deck-2/react";

interface MediaState {
  readonly title: string | null;
  readonly artist: string | null;
  readonly isPlaying: boolean;
  readonly volume: number;
  readonly canGoNext: boolean;
  readonly canGoPrev: boolean;
}

const Component = () => {
  const { data } = useAddonChannel<MediaState>("media-player:state");
  if (data === null || data === undefined) {
    return (
      <Text size="xs" tone="muted" typography="mono" className="flex h-full w-full items-center justify-center">
        No media
      </Text>
    );
  }
  return (
    <span className="grid h-full w-full grid-cols-2 divide-x divide-frame">
      <span className="flex flex-col items-center justify-center p-1">
        <Text size="xs" tone="muted" typography="aux" fit="ellipsis">Now playing</Text>
        <Text size="xs" tone="fg" fit="ellipsis">{data.title ?? "—"}</Text>
        <Text size="xs" tone="muted" fit="ellipsis">{data.artist ?? ""}</Text>
        <Text size="xs" tone="accent">{data.isPlaying ? "Playing" : "Paused"}</Text>
      </span>
      <span className="flex flex-col items-center justify-center p-1">
        <Text size="xs" tone="muted" typography="aux" fit="ellipsis">Volume</Text>
        <span className="block h-1.5 w-3/4 overflow-hidden rounded bg-bar">
          <span
            className="block h-full bg-accent"
            style={{ width: `${Math.max(0, Math.min(100, data.volume))}%` }}
          />
        </span>
        <Text size="xs" tone="fg">{data.volume.toFixed(0)}%</Text>
      </span>
    </span>
  );
};

export default Component;
