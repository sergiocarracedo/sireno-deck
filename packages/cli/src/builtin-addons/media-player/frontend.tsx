import { Text } from "@sireno-deck-2/cli";
import { useAddonChannel } from "sireno-deck-2/react";
import { MediaSurface } from "./components/MediaSurface";

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
  readonly status?: "play" | "pause" | "stop" | null;
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

  if (bt === "core:media-player") {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Text size="3xl" tone="primary">{glyph}</Text>
        <Text size="xs" tone="fg" typography="aux">{label}</Text>
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
