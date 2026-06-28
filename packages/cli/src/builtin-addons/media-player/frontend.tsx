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
} as const;

const Component = ({ buttonType }: { buttonType?: string }) => {
  const bt = buttonType ?? "core:media-player";
  const { data } = useAddonChannel<MediaState>("media-player:state");

  if (bt === "core:media-mute" || bt === "core:media-volume") {
    const glyph = GLYPHS[bt] ?? "🔊";
    const label = bt === "core:media-mute" ? "Mute" : "Volume";
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Text size="3xl" tone="primary" typography="main">{glyph}</Text>
        <Text size="xs" tone="fg" typography="aux">{label}</Text>
      </span>
    );
  }

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
      <Text size="md" tone="muted" typography="main">No media</Text>
    </span>
  );
};

export default Component;
