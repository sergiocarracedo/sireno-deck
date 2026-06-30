import type { AddonFrontendButton } from "@/addon/api";

const MediaMuteButtonFrontend: AddonFrontendButton = () => (
  <span className="flex h-full w-full flex-col items-center justify-center gap-1">
    <span className="text-3xl text-primary">🔇</span>
    <span className="text-xs text-fg">Mute</span>
  </span>
);

export default MediaMuteButtonFrontend;