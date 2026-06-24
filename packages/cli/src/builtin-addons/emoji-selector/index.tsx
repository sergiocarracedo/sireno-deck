import { z } from "zod";

import type { AddonButtonTypeDefinition, AddonDeckDefinition } from "@/addon/api.ts";
import type { AddonGeneratedDeck } from "@/addon/api.ts";

import {
  CATEGORY_DEFINITIONS,
  EMOJI_PAGE_SIZE,
  EmojiSelectorDeckSchema,
  type EmojiSelectorDeckConfig,
} from "./support.ts";

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
      type: "emoji-emoji-button",
    });
  });
  if (totalPages > 1) {
    const prevDeckId = pageNumber > 1 ? `${baseDeckId}-p${pageNumber - 1}` : null;
    const nextDeckId = pageNumber < totalPages ? `${baseDeckId}-p${pageNumber + 1}` : null;
    buttons.push({
      type: "emoji-page-nav",
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
    const totalPages = Math.max(1, Math.ceil(category.emojis.length / EMOJI_PAGE_SIZE));
    const firstDeckId =
      totalPages > 1 ? `${deck.id}-${category.id}-p1` : `${deck.id}-${category.id}`;
    topButtons.push({
      icon: category.icon,
      label: category.label,
      position: idx,
      target_deck: firstDeckId,
      type: "emoji-category-button",
    });
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const start = (pageNumber - 1) * EMOJI_PAGE_SIZE;
      const end = Math.min(start + EMOJI_PAGE_SIZE, category.emojis.length);
      const pageEmojis = category.emojis.slice(start, end);
      const baseDeckId = `${deck.id}-${category.id}`;
      const deckId = totalPages > 1 ? `${baseDeckId}-p${pageNumber}` : baseDeckId;
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

export const emojiSelectorDeck: AddonDeckDefinition = {
  type: "emoji-selector",
  configSchema: EmojiSelectorDeckSchema,
  createDecks: ({
    config,
    deck,
  }: {
    config: z.infer<typeof EmojiSelectorDeckSchema>;
    deck: { id: string };
  }) => generateDecks(deck, config),
};

export const builtinEmojiCategoryButton: AddonButtonTypeDefinition = {
  type: "emoji-category-button",
  configSchema: z.object({}).strict(),
  render: ({ config }) => {
    const iconRef = (config as { icon?: string }).icon ?? "🙂";
    const labelRef = (config as { label?: string }).label ?? "Category";
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1">
        <span className="text-3xl leading-none">{iconRef}</span>
        <span className="text-xs uppercase tracking-wider text-muted">{labelRef}</span>
      </span>
    );
  },
};

export const builtinEmojiEmojiButton: AddonButtonTypeDefinition = {
  type: "emoji-emoji-button",
  configSchema: z.object({}).strict(),
  render: ({ config }) => {
    const emoji = (config as { emoji?: string }).emoji ?? "❓";
    return (
      <span className="flex h-full w-full items-center justify-center text-3xl leading-none">
        {emoji}
      </span>
    );
  },
};

export const builtinEmojiLauncherButton: AddonButtonTypeDefinition = {
  type: "emoji-launcher-button",
  configSchema: z.object({}).strict(),
  render: () => (
    <span className="flex h-full w-full items-center justify-center gap-1">
      <span className="text-2xl leading-none">🙂</span>
      <span className="font-mono text-xs uppercase tracking-wider text-muted">Emoji</span>
    </span>
  ),
  onTap: ({ methods }) => {
    void methods["navigate-deck"]?.("emoji");
  },
};

export const builtinEmojiBackButton: AddonButtonTypeDefinition = {
  type: "emoji-back-button",
  configSchema: z.object({}).strict(),
  render: () => (
    <span className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-wider text-muted">
      Back
    </span>
  ),
  onTap: ({ methods }) => {
    void methods["navigate-deck"]?.("main");
  },
};

export const builtinEmojiPageNavButton: AddonButtonTypeDefinition = {
  type: "emoji-page-nav",
  configSchema: z.object({}).strict(),
  render: ({ config }) => {
    const prev = (config as { prev_deck_id?: string }).prev_deck_id;
    const next = (config as { next_deck_id?: string }).next_deck_id;
    const page = (config as { page?: number }).page ?? 1;
    const total = (config as { total_pages?: number }).total_pages ?? 1;
    return (
      <span className="flex h-full w-full items-center justify-between gap-1 px-2 font-mono text-[10px] uppercase tracking-wider text-muted">
        {prev ? (
          <span
            className="cursor-pointer text-fg hover:text-accent"
            onClick={(e) => {
              e.stopPropagation();
              void (window as unknown as { __SIRENO_NAV__?: (id: string) => void }).__SIRENO_NAV__?.(prev);
            }}
          >
            ‹
          </span>
        ) : (
          <span />
        )}
        <span>
          {page}/{total}
        </span>
        {next ? (
          <span
            className="cursor-pointer text-fg hover:text-accent"
            onClick={(e) => {
              e.stopPropagation();
              void (window as unknown as { __SIRENO_NAV__?: (id: string) => void }).__SIRENO_NAV__?.(next);
            }}
          >
            ›
          </span>
        ) : (
          <span />
        )}
      </span>
    );
  },
};

export const emojiSelectorAddon = {
  apiVersion: 3 as const,
  name: "emoji-selector",
  kind: "runtime" as const,
  buttons: [
    builtinEmojiCategoryButton,
    builtinEmojiEmojiButton,
    builtinEmojiLauncherButton,
    builtinEmojiBackButton,
    builtinEmojiPageNavButton,
  ],
  decks: [emojiSelectorDeck],
};