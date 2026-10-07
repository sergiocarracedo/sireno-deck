import { useMemo, useState } from "react"
import { Button, Input } from "@heroui/react"

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
                  <Button
                    key={`${category.id}:${emoji.char}`}
                    type="button"
                    size="sm"
                    variant={value === emoji.char ? "secondary" : "tertiary"}
                    isIconOnly
                    aria-label={emoji.shortcode ?? emoji.char}
                    aria-pressed={value === emoji.char}
                    title={emoji.shortcode}
                    className="size-9 min-w-9 rounded-md p-0 text-xl hover:outline hover:outline-2 hover:outline-primary"
                    onPress={() => onSelect(emoji.char)}
                  >
                    {emoji.char}
                  </Button>
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  )
}
