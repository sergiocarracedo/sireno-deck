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

const GLYPHS = {
  "core:media-mute": "🔇",
  "core:media-volume": "🔊",
  "core:media-player": "🎵",
} as const;

const LABELS = {
  "core:media-mute": "Mute",
  "core:media-volume": "Volume",
  "core:media-player": "Player",
} as const;

const Component = ({ buttonType }: { buttonType?: string }) => {
  const bt = (buttonType ?? "core:media-player") as keyof typeof GLYPHS;
  const glyph = GLYPHS[bt] ?? "🎵";
  const label = LABELS[bt] ?? "Player";
  const { data } = useAddonChannel<MediaState>("media-player:state");

  if (bt === "core:media-player" && data !== null && data !== undefined) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
        <Text size="2xl" tone="primary">{glyph}</Text>
        {data.title !== null && (
          <Text size="xs" tone="fg" fit="ellipsis">{data.title}</Text>
        )}
        {data.artist !== null && (
          <Text size="xs" tone="muted" fit="ellipsis">{data.artist}</Text>
        )}
        <Text size="xs" tone="accent">
          {data.isPlaying ? "Playing" : "Paused"}
        </Text>
      </span>
    );
  }

  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1">
      <Text size="3xl" tone="primary">{glyph}</Text>
      <Text size="xs" tone="fg" typography="aux">{label}</Text>
    </span>
  );
};

export default Component;
