import type { AddonGeneratedDeck, AddonDeckDefinition } from "@/addon/api";

import {
  CATEGORY_DEFINITIONS,
  EMOJI_PAGE_SIZE,
  EmojiSelectorDeckSchema,
  type EmojiSelectorDeckConfig,
} from "../support";

interface PageButton {
  type: string;
  position: number;
  [key: string]: unknown;
}

const buildPage = (
  baseDeckId: string,
  pageNumber: number,
  totalPages: number,
  emojis: readonly string[],
): PageButton[] => {
  const buttons: PageButton[] = [];
  emojis.forEach((emoji, offset) => {
    buttons.push({
      emoji,
      label: emoji,
      position: offset,
      type: "emoji-selector:emoji",
    });
  });
  if (totalPages > 1) {
    const prevDeckId =
      pageNumber > 1 ? `${baseDeckId}-p${pageNumber - 1}` : null;
    const nextDeckId =
      pageNumber < totalPages ? `${baseDeckId}-p${pageNumber + 1}` : null;
    buttons.push({
      type: "emoji-selector:page-nav",
      position: buttons.length,
      page: pageNumber,
      total_pages: totalPages,
      ...(prevDeckId ? { prev_deck_id: prevDeckId } : {}),
      ...(nextDeckId ? { next_deck_id: nextDeckId } : {}),
    });
  }
  return buttons;
};

const generateDecks = (
  deck: { id: string },
  config: EmojiSelectorDeckConfig,
): Record<string, AddonGeneratedDeck> => {
  const decks: Record<string, AddonGeneratedDeck> = {};
  const categories = [
    ...(config.favorites.length > 0
      ? [
          {
            id: "favorites",
            label: "Favorites",
            icon: "⭐",
            emojis: config.favorites,
          },
        ]
      : []),
    ...CATEGORY_DEFINITIONS.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      emojis: c.emojis,
    })),
  ];

  const topButtons: PageButton[] = [];
  categories.forEach((category, idx) => {
    const totalPages = Math.max(
      1,
      Math.ceil(category.emojis.length / EMOJI_PAGE_SIZE),
    );
    const firstDeckId =
      totalPages > 1
        ? `${deck.id}-${category.id}-p1`
        : `${deck.id}-${category.id}`;
    topButtons.push({
      icon: category.icon,
      label: category.label,
      position: idx,
      target_deck: firstDeckId,
      type: "emoji-selector:category",
    });
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const start = (pageNumber - 1) * EMOJI_PAGE_SIZE;
      const end = Math.min(start + EMOJI_PAGE_SIZE, category.emojis.length);
      const pageEmojis = category.emojis.slice(start, end);
      const baseDeckId = `${deck.id}-${category.id}`;
      const deckId =
        totalPages > 1 ? `${baseDeckId}-p${pageNumber}` : baseDeckId;
      const name =
        totalPages > 1
          ? `${category.label} ${pageNumber}/${totalPages}`
          : category.label;
      decks[deckId] = {
        name,
        buttons: buildPage(baseDeckId, pageNumber, totalPages, pageEmojis),
      };
    }
  });

  decks[deck.id] = {
    name: "Emoji Selector",
    buttons: topButtons,
  };

  return decks;
};

const emojiSelectorDeckDefinition: AddonDeckDefinition = {
  type: "emoji-selector",
  createDecks: ({
    config,
  }: {
    config: unknown;
    deck: { id: string };
  }): Record<string, AddonGeneratedDeck> => {
    const cfg =
      config && typeof config === "object" && "favorites" in config
        ? (config as EmojiSelectorDeckConfig)
        : { favorites: [] };
    return generateDecks({ id: "emoji-selector" }, cfg);
  },
};

export default emojiSelectorDeckDefinition;
export { emojiSelectorDeckDefinition as emojiSelectorDeckFactory, EmojiSelectorDeckSchema };