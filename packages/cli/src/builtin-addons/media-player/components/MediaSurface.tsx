import type { ReactElement } from "react";
import { Text } from "@sireno-deck-2/cli";
import type { MediaButtonStatus } from "./status-meta";
import { ProgressBar } from "./ProgressBar";

interface MediaSurfaceProps {
  title: string;
  artist: string;
  source: string;
  progress: number;
  status: MediaButtonStatus;
  time: string;
}

const STATUS_GLYPH: Record<MediaButtonStatus, string> = {
  play: "▶",
  pause: "⏸",
  stop: "⏹",
  unsupported: "⚠",
  notAvailable: "⚠",
};

export const MediaSurface = ({
  title,
  artist,
  source,
  progress,
  status,
  time,
}: MediaSurfaceProps): ReactElement => (
  <div className="flex h-full w-full flex-col gap-0.5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-primary">{STATUS_GLYPH[status] ?? "•"}</span>
      <Text align="right" size="md" tone="primary">
        {time}
      </Text>
    </div>

    <div className="flex min-w-0 flex-col gap-0">
      <Text align="left" fit="ellipsis" size="md" tone="fg" className="font-bold">
        {title}
      </Text>
      <Text align="left" fit="ellipsis" size="sm" tone="muted">
        {artist}
      </Text>
    </div>

    <ProgressBar className="mt-auto" status={status} value={progress} />
  </div>
);
