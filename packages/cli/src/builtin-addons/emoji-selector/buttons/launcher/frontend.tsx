import type { AddonFrontendButton } from "@/addon/api";

const LauncherButtonFrontend: AddonFrontendButton = () => (
  <span className="flex h-full w-full items-center justify-center gap-1">
    <span className="text-2xl leading-none">🙂</span>
    <span className="font-mono text-xs uppercase tracking-wider text-muted">
      Emoji
    </span>
  </span>
);

export default LauncherButtonFrontend;