/** The source flag extends along +X; the boat travels in that direction. */
export function sailboatFlagVertex(
  x: number,
  z: number,
  mastX: number,
  seconds: number,
) {
  const distance = Math.max(0, x - mastX)
  return {
    x: mastX - distance,
    z: z + distance * 0.12 * Math.sin(seconds * 5 - distance * 0.18),
  }
}
