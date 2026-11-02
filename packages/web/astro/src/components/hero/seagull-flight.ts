/** Gentle orbit and individual wingbeat for one of the five birds. */
export function seagullFlight(
  seconds: number,
  index: number,
  horizontalScale: number,
) {
  const angle = seconds * (0.21 + index * 0.008) + (index * Math.PI * 2) / 5
  const radiusX = 5.3 - index * 0.18
  const radiusZ = 1.2 + index * 0.12
  const variant = index % 4
  const driftX = 0.18 + variant * 0.08
  const driftZ = 0.12 + variant * 0.06
  const phase = variant * 0.7
  const dx =
    (-radiusX * Math.sin(angle) + 2 * driftX * Math.cos(2 * angle + phase)) *
    horizontalScale
  const dz =
    radiusZ * Math.cos(angle) - 2 * driftZ * Math.sin(2 * angle + phase)
  // Fade into and out of a four-second glide; stagger it between birds.
  const cycle = (seconds + index * 2.7) % 15
  const flapWeight = Math.min(1, Math.max(0, 2 - cycle, cycle - 6))
  const amplitude = 0.65 + index * 0.04
  return {
    x:
      (radiusX * Math.cos(angle) + driftX * Math.sin(2 * angle + phase)) *
      horizontalScale,
    y: 2.05 + index * 0.06 + 0.16 * Math.sin(angle * 2 + index * 0.4),
    z: -2.4 + radiusZ * Math.sin(angle) + driftZ * Math.cos(2 * angle + phase),
    yaw: -Math.atan2(dz, dx),
    bank: 0.09 * Math.sin(angle),
    flap:
      amplitude *
      flapWeight *
      Math.sin(seconds * (3.2 + index * 0.45) + index * 0.8),
  }
}

/** Rotate the mesh's two outer wings around their local X-axis roots. */
export function flapWing(y: number, z: number, angle: number) {
  const distance = Math.abs(z) - 8
  if (distance <= 0) return { y, z }
  const weight = Math.min(1, distance / 7)
  const vertical = y - 8
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)
  const nextY = 8 + vertical * cos + distance * sin
  const nextZ = Math.sign(z) * (8 + distance * cos - vertical * sin)
  return { y: y + (nextY - y) * weight, z: z + (nextZ - z) * weight }
}
