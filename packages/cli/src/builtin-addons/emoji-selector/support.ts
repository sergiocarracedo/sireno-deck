import { z } from 'zod'

export const EMOJI_LAUNCHER_GRID: readonly string[] = [
  '\u{1F602}',
  '\u{1F525}',
  '\u2764\uFE0F',
  '\u2B50',
  '\u{1F355}',
  '\u{1F3B5}',
]

export const EMOJI_FONT_STACK =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', system-ui, sans-serif"

export const DEFAULT_FAVORITES: readonly string[] = [
  '❤️',
  '🔥',
  '⭐',
  '😂',
  '👍',
  '🎉',
  '💯',
  '✨',
  '🙏',
  '👑',
] as const

export const EmojiLauncherButtonSchema = z
  .object({
    label: z.string().min(1).default('Emojis'),
  })
  .strict()

export const EmojiSelectorDeckSchema = z
  .object({
    favorites: z.array(z.string().min(1)).default([...DEFAULT_FAVORITES]),
  })
  .strict()

export type EmojiSelectorDeckConfig = z.infer<typeof EmojiSelectorDeckSchema>
