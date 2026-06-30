import type { NewAddonManifest } from "@/addon/api";

import { emojiSelectorDeckFactory } from "./decks";
import {
  BackButtonFrontend,
  CategoryButtonFrontend,
  EmojiButtonFrontend,
  LauncherButtonFrontend,
  PageNavButtonFrontend,
} from "./buttons/all.frontend";
import { backButtonBackend } from "./buttons/back";
import { categoryButtonBackend } from "./buttons/category";
import { emojiButtonBackend } from "./buttons/emoji";
import { launcherButtonBackend } from "./buttons/launcher";
import { pageNavButtonBackend } from "./buttons/page-nav";

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "emoji-selector",
  frontend: { main: "./index" },
  kind: "runtime",
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
