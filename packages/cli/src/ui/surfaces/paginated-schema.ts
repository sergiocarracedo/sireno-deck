import { z } from "zod"

/**
 * Wraps a page schema to accept either a single page object or an array.
 * Normalizes to `{ pages: [...] }`.
 *
 * @example
 * const Config = pagesSchema(z.discriminatedUnion("type", [BarPage, ChartPage]))
 * // single:  { type: "bars", metrics: ["cpu"] }  → { pages: [{ type: "bars", metrics: [...] }] }
 * // array:   [{ type: "bars", ... }, { type: "chart", ... }] → { pages: [...] }
 */
export function pagesSchema<T extends z.ZodTypeAny>(page: T) {
  return z.preprocess(
    (input) => {
      if (Array.isArray(input)) return { pages: input }
      if (input && typeof input === "object" && !("pages" in input))
        return { pages: [input] }
      return input
    },
    z.object({ pages: z.array(page).min(1).max(5) }).strict(),
  )
}
