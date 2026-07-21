import type pino from "pino"

/**
 * Assigns unique, in-range positions to a list of buttons.
 *
 * - Buttons with explicit `position` keep it (first-come wins for duplicates).
 * - Duplicate positions are bumped to the next available gap.
 * - Buttons without `position` fill remaining gaps in array order.
 * - Positions ≥ keyCount are dropped with a warning.
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
      logger?.warn({ position: pos, keyCount }, "button position overflow, dropping")
      continue
    }
    if (occupied.has(pos)) {
      logger?.warn({ position: pos }, "duplicate position, treating as unfixed")
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
      logger?.warn({ keyCount }, "no room for remaining buttons, dropping")
      break
    }
    occupied.add(gap)
    result.push({ ...btn, position: gap } as T)
    gap++
  }

  return result
}
