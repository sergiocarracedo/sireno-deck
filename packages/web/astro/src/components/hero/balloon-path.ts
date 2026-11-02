const BALLOON_SPEED = 0.3
const OFFSCREEN_MARGIN = 1.6
const OFFSCREEN_WAIT = 1

export function balloonTravelSeconds(viewWidth: number): number {
  return (viewWidth + 2 * OFFSCREEN_MARGIN) / BALLOON_SPEED
}

export function balloonPath(seconds: number, viewWidth: number) {
  const travelTime = balloonTravelSeconds(viewWidth)
  const cycleTime = travelTime + OFFSCREEN_WAIT
  const cycle = Math.floor(seconds / cycleTime)
  const distance = Math.min(seconds % cycleTime, travelTime) * BALLOON_SPEED
  const variant = cycle % 4
  return {
    x: -viewWidth / 2 - OFFSCREEN_MARGIN + distance,
    y:
      2.7 +
      (variant - 1.5) * 0.09 +
      0.12 * Math.sin(seconds * (0.3 + variant * 0.03)),
    rotationZ: (Math.PI / 36) * Math.sin(seconds * 0.27),
  }
}
