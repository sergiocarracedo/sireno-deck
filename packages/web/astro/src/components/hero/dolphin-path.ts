export const DOLPHIN_LOOP_SECONDS = 16

/** Position and forward tangent on a closed, gently asymmetric swimming loop. */
export function dolphinPath(seconds: number, horizontalScale: number) {
  const angle = (seconds / DOLPHIN_LOOP_SECONDS) * Math.PI * 2
  const jumpPhase = angle - 0.8
  const jump = (1 + Math.cos(jumpPhase)) / 2

  return {
    x:
      (3.1 + 3.3 * Math.cos(angle) + 0.35 * Math.sin(2 * angle)) *
      horizontalScale,
    y: -0.35 + 1.8 * jump * jump,
    z: 1.4 + 2 * Math.sin(angle),
    dx: (-3.3 * Math.sin(angle) + 0.7 * Math.cos(2 * angle)) * horizontalScale,
    dy: -1.8 * jump * Math.sin(jumpPhase),
    dz: 2 * Math.cos(angle),
  }
}
