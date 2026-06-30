import type { NewAddonManifest } from "@/addon/api";

import { BackButtonFrontend, backButtonBackend } from "./buttons/back";
import { CategoryButtonFrontend, categoryButtonBackend } from "./buttons/category";
import { emojiSelectorDeckFactory } from "./decks";
import { EmojiButtonFrontend, emojiButtonBackend } from "./buttons/emoji";
import { LauncherButtonFrontend, launcherButtonBackend } from "./buttons/launcher";
import { PageNavButtonFrontend, pageNavButtonBackend } from "./buttons/page-nav";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "emoji-selector",
  frontend: { main: "./index" },
  buttonTypes: {
    "emoji-selector:category": {
      frontend: CategoryButtonFrontend,
      backend: categoryButtonBackend,
    },
    "emoji-selector:emoji": {
      frontend: EmojiButtonFrontend,
      backend: emojiButtonBackend,
    },
    "emoji-selector:launcher": {
      frontend: LauncherButtonFrontend,
      backend: launcherButtonBackend,
    },
    "emoji-selector:back": {
      frontend: BackButtonFrontend,
      backend: backButtonBackend,
    },
    "emoji-selector:page-nav": {
      frontend: PageNavButtonFrontend,
      backend: pageNavButtonBackend,
    },
  },
  decks: {
    "emoji-selector": emojiSelectorDeckFactory,
  },
};

export const emojiSelectorAddon = manifest;
export default emojiSelectorAddon;
export { EmojiSelectorDeckSchema } from "./support";
