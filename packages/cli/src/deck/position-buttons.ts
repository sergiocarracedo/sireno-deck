import type pino from "pino"

/**
 * Assigns unique, in-range positions to a list of buttons.
 *
 * - Buttons with explicit `position` keep it (first-come wins for duplicates).
 * - Duplicate positions are bumped to the next available gap.
 * - Buttons without `position` fill remaining gaps in array order.
 * - Positions ≥ keyCount or < 0 are dropped with a debug log.
 * - Returns a sparse array — only assigned buttons (length ≤ keyCount).
 *
 * ponytail: O(n²) scan — fine for deck sizes (<30).
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
    if (pos >= keyCount) {
      // ponytail: overflow positions are valid — pagination maps
      // floor(pos / (K-2)) / mod(K-2) for each page. n-1 and n-2 stay
      // reserved for the system, so e.g. position 15 on a 15-key
      // device maps to page 1, slot 2.
      continue
    }
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
    while (gap < keyCount && occupied.has(gap)) gap++
    if (gap >= keyCount) {
      logger?.debug(
        { keyCount, reason: "exhausted" },
        "no room for remaining buttons, dropping",
      )
      break
    }
    occupied.add(gap)
    result.push({ ...btn, position: gap } as T)
    gap++
  }

  return result
}
