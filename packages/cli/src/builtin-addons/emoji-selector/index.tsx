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
    "core:emoji-category-button": {
      frontend: CategoryButtonFrontend,
      backend: categoryButtonBackend,
    },
    "core:emoji-emoji-button": {
      frontend: EmojiButtonFrontend,
      backend: emojiButtonBackend,
    },
    "core:emoji-launcher-button": {
      frontend: LauncherButtonFrontend,
      backend: launcherButtonBackend,
    },
    "core:emoji-back-button": {
      frontend: BackButtonFrontend,
      backend: backButtonBackend,
    },
    "core:emoji-page-nav": {
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
