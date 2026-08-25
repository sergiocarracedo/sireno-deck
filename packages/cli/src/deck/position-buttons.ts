import type pino from "pino"

/**
 * Assigns a position to every button — no drops.
 *
 * - Buttons with a valid explicit `position` keep it (first-come wins
 *   for duplicates).
 * - Duplicate positions and buttons without a position fall through to
 *   a "gap" queue, filled sequentially starting at 0 in array order.
 * - Positions ≥ keyCount are preserved: the caller is responsible for
 *   pagination (group by `floor(pos / (K-2))`). The deck-config and
 *   addon-deck pipelines both go through `paginateDeck` for that.
 * - The internal contract: every emitted button has `position` set.
 *
 * ponytail: O(n²) scan is fine for deck sizes (<30).
 */
export const positionButtons = <T extends { position?: number }>(
  buttons: readonly T[],
  keyCount: number,
  logger?: pino.Logger,
): T[] => {
  const occupied = new Set<number>()
  const result: T[] = []
  const unfixed: T[] = []

  for (const btn of buttons) {
    const pos = btn.position
    if (pos === undefined || !Number.isFinite(pos) || pos < 0) {
      unfixed.push(btn)
      continue
    }
    // ponytail: positions ≥ keyCount are preserved as deck-global ordering
    // hints. Pagination groups them via floor(pos / (K-2)); the deck-config
    // pipeline runs paginateDeck before the frontend serializes per-page
    // slot positions.
    if (occupied.has(pos)) {
      logger?.debug(
        { position: pos, reason: "duplicate" },
        "duplicate position, treating as unfixed",
      )
      unfixed.push(btn)
      continue
    }
    occupied.add(pos)
    result.push(btn)
  }

  let gap = 0
  for (const btn of unfixed) {
    while (occupied.has(gap)) gap++
    occupied.add(gap)
    result.push({ ...btn, position: gap } as T)
    gap++
  }

  return result
}
