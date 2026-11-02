export const SAILBOAT_LOOP_SECONDS = 90

/** A closed route around the island, rocks and lighthouse. The model faces +X. */
export function sailboatPath(seconds: number, horizontalScale: number) {
  const angle = (seconds / SAILBOAT_LOOP_SECONDS) * Math.PI * 2
  const dx = 11 * Math.cos(angle) * horizontalScale
  const dz = 17 * Math.cos(2 * angle)
  return {
    x: 11 * Math.sin(angle) * horizontalScale,
    z: -0.5 + 8.5 * Math.sin(2 * angle) - (horizontalScale < 1 ? 4 : 0),
    yaw: -Math.atan2(dz, dx),
  }
}
