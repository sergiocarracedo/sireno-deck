/** Number of tiles needed on each side of the center tile. */
export function oceanTileRadius(viewWidth: number, tileWidth: number): number {
  return Math.max(1, Math.ceil((viewWidth / 2 + tileWidth / 2) / tileWidth))
}
