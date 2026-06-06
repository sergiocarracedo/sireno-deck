import { fileURLToPath } from 'node:url'

import { z } from 'zod'

import { Icon, Text } from '../../ui/index.js'

const CATEGORY_DEFINITIONS = [
  {
    emojis: [
      '😀',
      '😂',
      '🥳',
      '😎',
      '😍',
      '🤩',
      '😇',
      '🤔',
      '😴',
      '😭',
      '🤯',
      '🥶',
      '🥵',
      '😡',
      '🤢',
      '🤡',
    ],
    icon: 'addon://emoji-selector/smileys.svg',
    id: 'smileys',
    label: 'Smileys',
  },
  {
    emojis: ['🌿', '🌊', '🔥', '🌈', '⭐', '🌙', '☀️', '⚡', '❄️', '🌸', '🌳', '🌵'],
    icon: 'addon://emoji-selector/nature.svg',
    id: 'nature',
    label: 'Nature',
  },
  {
    emojis: [
      '🍕',
      '🍣',
      '☕',
      '🍓',
      '🍔',
      '🍟',
      '🌮',
      '🍣',
      '🍦',
      '🍩',
      '🍪',
      '🍰',
      '🍫',
      '🍿',
      '🥗',
      '🍜',
    ],
    icon: 'addon://emoji-selector/food.svg',
    id: 'food',
    label: 'Food',
  },
  {
    emojis: [
      '⚽',
      '🏀',
      '🎾',
      '🏈',
      '⚾',
      '🎱',
      '🏓',
      '🏸',
      '🥊',
      '🏆',
      '🎯',
      '🎮',
      '🎲',
      '🎵',
    ],
    icon: 'addon://emoji-selector/activities.svg',
    id: 'activities',
    label: 'Activities',
  },
  {
    emojis: [
      '❤️',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '💔',
      '❗',
      '❓',
      '💯',
      '✨',
      '⭐',
      '🔔',
      '🎉',
    ],
    icon: 'addon://emoji-selector/symbols.svg',
    id: 'symbols',
    label: 'Symbols',
  },
  {
    emojis: [
      '⌚',
      '📱',
      '💻',
      '⌨️',
      '🖥️',
      '🖱️',
      '🖨️',
      '💾',
      '💿',
      '📷',
      '🎥',
      '📺',
      '📻',
      '☎️',
      '🔋',
    ],
    icon: 'addon://emoji-selector/objects.svg',
    id: 'objects',
    label: 'Objects',
  },
]

const assets = {
  'back.svg': fileURLToPath(new URL('./assets/back.svg', import.meta.url)),
  'emoji-berry.svg': fileURLToPath(
    new URL('./assets/emoji-berry.svg', import.meta.url),
  ),
  'emoji-coffee.svg': fileURLToPath(
    new URL('./assets/emoji-coffee.svg', import.meta.url),
  ),
  'emoji-cool.svg': fileURLToPath(
    new URL('./assets/emoji-cool.svg', import.meta.url),
  ),
  'emoji-fire.svg': fileURLToPath(
    new URL('./assets/emoji-fire.svg', import.meta.url),
  ),
  'emoji-grin.svg': fileURLToPath(
    new URL('./assets/emoji-grin.svg', import.meta.url),
  ),
  'emoji-joy.svg': fileURLToPath(
    new URL('./assets/emoji-joy.svg', import.meta.url),
  ),
  'emoji-leaf.svg': fileURLToPath(
    new URL('./assets/emoji-leaf.svg', import.meta.url),
  ),
  'emoji-party.svg': fileURLToPath(
    new URL('./assets/emoji-party.svg', import.meta.url),
  ),
  'emoji-pizza.svg': fileURLToPath(
    new URL('./assets/emoji-pizza.svg', import.meta.url),
  ),
  'emoji-rainbow.svg': fileURLToPath(
    new URL('./assets/emoji-rainbow.svg', import.meta.url),
  ),
  'emoji-sushi.svg': fileURLToPath(
    new URL('./assets/emoji-sushi.svg', import.meta.url),
  ),
  'emoji-wave.svg': fileURLToPath(
    new URL('./assets/emoji-wave.svg', import.meta.url),
  ),
  'favorites.svg': fileURLToPath(
    new URL('./assets/favorites.svg', import.meta.url),
  ),
  'food.svg': fileURLToPath(new URL('./assets/food.svg', import.meta.url)),
  'nature.svg': fileURLToPath(new URL('./assets/nature.svg', import.meta.url)),
  'smileys.svg': fileURLToPath(
    new URL('./assets/smileys.svg', import.meta.url),
  ),
  'activities.svg': fileURLToPath(
    new URL('./assets/activities.svg', import.meta.url),
  ),
  'symbols.svg': fileURLToPath(
    new URL('./assets/symbols.svg', import.meta.url),
  ),
  'objects.svg': fileURLToPath(
    new URL('./assets/objects.svg', import.meta.url),
  ),
}

const EmojiCategoryButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    target_deck: z.string().min(1),
  })
  .strict()

const EmojiEntryButtonSchema = z
  .object({
    emoji: z.string().min(1),
    label: z.string().min(1),
    select_command: z.string().min(1),
  })
  .strict()

const EmojiBackButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
  })
  .strict()

const EmojiSelectorDeckSchema = z
  .object({
    favorites: z.array(z.string().min(1)).default([]),
    select_command: z.string().min(1),
  })
  .strict()

const EMOJI_ICON_ASSETS: Record<string, string> = {
  '\u{1F300}': 'addon://emoji-selector/emoji-rainbow.svg',
  '\u{1F30A}': 'addon://emoji-selector/emoji-wave.svg',
  '\u{1F333}': 'addon://emoji-selector/emoji-leaf.svg',
  '\u{1F34D}': 'addon://emoji-selector/emoji-berry.svg',
  '\u{1F355}': 'addon://emoji-selector/emoji-pizza.svg',
  '\u{1F363}': 'addon://emoji-selector/emoji-sushi.svg',
  '\u{1F389}': 'addon://emoji-selector/emoji-party.svg',
  '\u{1F525}': 'addon://emoji-selector/emoji-fire.svg',
  '\u{1F600}': 'addon://emoji-selector/emoji-grin.svg',
  '\u{1F602}': 'addon://emoji-selector/emoji-joy.svg',
  '\u{1F60E}': 'addon://emoji-selector/emoji-cool.svg',
  '\u{2615}': 'addon://emoji-selector/emoji-coffee.svg',
}

function getEmojiFallbackLabel(emoji: string): string {
  const mapped = {
    '\u{1F300}': 'RAIN',
    '\u{1F30A}': 'WAVE',
    '\u{1F333}': 'LEAF',
    '\u{1F34D}': 'BERRY',
    '\u{1F355}': 'PIZZA',
    '\u{1F363}': 'SUSHI',
    '\u{1F389}': 'PARTY',
    '\u{1F525}': 'FIRE',
    '\u{1F600}': 'GRIN',
    '\u{1F602}': 'JOY',
    '\u{1F60E}': 'COOL',
    '\u{2615}': 'COFFEE',
  }[emoji]
  if (mapped) {
    return mapped
  }

  const codePoints = Array.from(emoji, (symbol) =>
    symbol.codePointAt(0)?.toString(16).toUpperCase(),
  ).filter((codePoint): codePoint is string => codePoint !== undefined)

  return codePoints[0] ? `U+${codePoints[0]}` : 'EMOJI'
}

function renderEmojiText(
  label: string,
) {
  return (
    <Text
      className="w-full leading-tight"
      fit="wrap"
      tone="foreground"
      typography="main"
    >
      {label}
    </Text>
  )
}

function createButtonNode(label: string, icon?: string) {
  return (
    <div className="flex flex-col items-center justify-center w-full gap-1.5">
      {icon ? <Icon src={icon} /> : null}
      {renderEmojiText(label)}
    </div>
  )
}

export {
  assets,
  CATEGORY_DEFINITIONS,
  createButtonNode,
  EmojiBackButtonSchema,
  EmojiCategoryButtonSchema,
  EMOJI_ICON_ASSETS,
  EmojiEntryButtonSchema,
  getEmojiFallbackLabel,
  EmojiSelectorDeckSchema,
  renderEmojiText,
}
