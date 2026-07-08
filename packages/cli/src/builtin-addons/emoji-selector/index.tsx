import type { NewAddonManifest } from "@/addon/api";

import { CategoryButtonFrontend, categoryButtonBackend } from "./buttons/category";
import { EmojiButtonFrontend, emojiButtonBackend } from "./buttons/emoji";
import { LauncherButtonFrontend, launcherButtonBackend } from "./buttons/launcher";
import { emojiSelectorDeckFactory } from "./decks";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "emoji-selector",
  frontend: { main: "./index" },
  buttonTypes: {
    "emoji-selector:category": {
      frontend: CategoryButtonFrontend,
      backend: { ...categoryButtonBackend, gestureHandlers: ["tap"] as const },
      internal: true,
    },
    "emoji-selector:emoji": {
      frontend: EmojiButtonFrontend,
      backend: { ...emojiButtonBackend, gestureHandlers: ["tap"] as const },
      internal: true,
    },
    "emoji-selector:launcher": {
      frontend: LauncherButtonFrontend,
      backend: { ...launcherButtonBackend, gestureHandlers: ["tap"] as const },
      internal: true,
    },
  },
  decks: {
    "emoji-selector": {
      deck: emojiSelectorDeckFactory,
      internal: true,
    },
  },
};

export const emojiSelectorAddon = manifest;
export default emojiSelectorAddon;
export { EmojiSelectorDeckSchema } from "./support";
