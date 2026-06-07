import { fileURLToPath } from 'node:url'

import { z } from 'zod'

import { Icon, Label, Text } from '../../ui/index.js'

import categoriesData from './data/categories.json' with { type: 'json' }

export interface EmojiEntryData {
  readonly char: string
  readonly shortcode: string
}

export interface CategoryData {
  readonly emojis: readonly string[]
  readonly icon: string
  readonly id: string
  readonly label: string
  readonly shortcodes: Readonly<Record<string, string>>
}

const CATEGORIES: readonly CategoryData[] = (
  categoriesData as Array<{
    emojis: EmojiEntryData[]
    icon: string
    id: string
    label: string
  }>
).map((category) => {
  const emojis: string[] = []
  const shortcodes: Record<string, string> = {}
  for (const entry of category.emojis) {
    emojis.push(entry.char)
    if (!(entry.char in shortcodes)) {
      shortcodes[entry.char] = entry.shortcode
    }
  }
  return {
    emojis,
    icon: category.icon,
    id: category.id,
    label: category.label,
    shortcodes,
  }
})

const CATEGORY_DEFINITIONS: readonly CategoryData[] = CATEGORIES

export function getEmojiShortcode(char: string): string | undefined {
  for (const category of CATEGORIES) {
    const code = category.shortcodes[char]
    if (code !== undefined) return code
  }
  return undefined
}

const assets = {
  'back.svg': fileURLToPath(new URL('./assets/back.svg', import.meta.url)),
  'launcher.svg': fileURLToPath(
    new URL('./assets/launcher.svg', import.meta.url),
  ),
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
    select_command_shortcode: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional command override for double-tap. When omitted, the double-tap uses the per-OS HID shim to deliver the emoji shortcode (e.g. `:fire:`).',
      ),
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
    system_back_hold_command: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional command to run on the system back hold gesture (≥600ms). When omitted, the default SRB-03 behavior applies (navigate to main deck).',
      ),
    system_back_tap_command: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional command to run on the system back tap gesture. When omitted, the default SRB-03 behavior applies (navigate to previous deck).',
      ),
  })
  .strict()

const EMOJI_LAUNCHER_GRID: readonly string[] = [
  '\u{1F602}',
  '\u{1F525}',
  '\u2764\uFE0F',
  '\u2B50',
  '\u{1F355}',
  '\u{1F3B5}',
]

const EmojiLauncherButtonSchema = z
  .object({
    label: z.string().min(1).default('Emoji'),
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

function renderEmojiText(label: string) {
  return <Label>{label}</Label>
}

function createButtonNode(label: string, icon?: string) {
  return (
    <div className="flex flex-col items-center justify-center w-full gap-1.5">
      {icon ? <Icon src={icon} size={30} /> : null}
      {renderEmojiText(label)}
    </div>
  )
}

export const EMOJI_FONT_STACK =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', system-ui, sans-serif"

export function renderEmojiGlyph(
  char: string,
  options?: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '5xl' },
) {
  return (
    <Text
      className="w-full h-full flex items-center justify-center leading-none"
      fontStack={EMOJI_FONT_STACK}
      size={options?.size ?? '2xl'}
    >
      {char}
    </Text>
  )
}

export const EMOJI_PAGE_SIZE = 13

export interface EmojiPage {
  emojis: string[]
  pageIndex: number
  totalPages: number
}

export function paginateEmojis(
  emojis: readonly string[],
  pageSize: number,
): EmojiPage[] {
  if (emojis.length === 0) return []

  const firstPageSize = pageSize
  const restPageSize = pageSize

  const pages: EmojiPage[] = []
  let remaining = [...emojis]

  pages.push({
    emojis: remaining.slice(0, firstPageSize),
    pageIndex: 0,
    totalPages: 0,
  })
  remaining = remaining.slice(firstPageSize)

  while (remaining.length > 0) {
    pages.push({
      emojis: remaining.slice(0, restPageSize),
      pageIndex: 0,
      totalPages: 0,
    })
    remaining = remaining.slice(restPageSize)
  }

  const total = pages.length
  for (const page of pages) {
    page.totalPages = total
  }

  return pages
}

export function generatePageLabel(
  categoryLabel: string,
  pageIndex: number,
  totalPages: number,
): string {
  if (totalPages <= 1) return categoryLabel
  return `${categoryLabel} (${pageIndex + 1}/${totalPages})`
}

export {
  assets,
  CATEGORY_DEFINITIONS,
  createButtonNode,
  EMOJI_ICON_ASSETS,
  EMOJI_LAUNCHER_GRID,
  EmojiBackButtonSchema,
  EmojiCategoryButtonSchema,
  EmojiEntryButtonSchema,
  EmojiLauncherButtonSchema,
  EmojiSelectorDeckSchema,
  getEmojiFallbackLabel,
  renderEmojiText,
}
