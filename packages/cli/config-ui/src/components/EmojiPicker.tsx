import { useMemo, useState } from "react"
import { Input } from "@heroui/react"

import { categories } from "@/builtin-addons/emoji-selector/data/categories"

export const EmojiPicker = ({
  value,
  onSelect,
}: {
  readonly value: string
  readonly onSelect: (emoji: string) => void
}) => {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return categories.map((category) => ({
      ...category,
      emojis: search
        ? category.emojis.filter((emoji) =>
            `${emoji.char} ${emoji.shortcode ?? ""}`
              .toLowerCase()
              .includes(search),
          )
        : category.emojis,
    }))
  }, [query])

  return (
    <div className="grid gap-3">
      <Input
        aria-label="Search emoji"
        placeholder="Search emoji or name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="max-h-[50vh] space-y-3 overflow-y-auto">
        {filtered.map((category) =>
          category.emojis.length === 0 ? null : (
            <section key={category.id} aria-label={category.label}>
              <h4 className="mb-1 text-sm text-muted">{category.label}</h4>
              <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
                {category.emojis.map((emoji) => (
                  <button
                    key={`${category.id}:${emoji.char}`}
                    type="button"
                    aria-label={emoji.shortcode ?? emoji.char}
                    aria-pressed={value === emoji.char}
                    title={emoji.shortcode}
                    className="size-9 rounded-md text-xl hover:bg-surface-secondary aria-pressed:bg-primary/20"
                    onClick={() => onSelect(emoji.char)}
                  >
                    {emoji.char}
                  </button>
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  )
}
