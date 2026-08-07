import { connectStreamDeck, type StreamDeckDevice } from "@/device/stream-deck"

import type pino from "pino"

// ponytail: extracted from RealOutputClient.pushBlackFrame so the parent
// process (service-supervisor) can push a black frame WITHOUT going through
// the full daemon init. Used on supervisor crash-on-exit — the device may be
// unplugged at that moment, so every step is best-effort and the errors are
// warn-logged, never thrown.
const buildBlackBuffer = (keyCount: number): Buffer => {
  const stride = 3 * 8
  const total = keyCount * stride * 8
  return Buffer.alloc(total)
}

export const pushBlackFrame = async (
  device: StreamDeckDevice,
  logger: pino.Logger,
): Promise<void> => {
  try {
    const buf = buildBlackBuffer(device.getKeyCount())
    for (let i = 0; i < device.getKeyCount(); i++) {
      await device.fillKeyBuffer(i, buf.subarray(0, 3 * 8 * 8))
    }
    // ponytail: brightness is a feature report processed synchronously by the
    // device firmware, so dimming to 0 is a guaranteed "off" signal even if the
    // queued image writes above are dropped at USB disconnect.
    await device.setBrightness(0)
    // ponytail: give the queued USB writes a moment to drain before the caller
    // closes the device; otherwise node-hid may flush to a closed handle and
    // the panel keeps the last fully-rendered frame.
    await new Promise<void>((r) => setTimeout(r, 200))
    logger.info("black-frame: pushed")
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      "black-frame: push failed (non-fatal)",
    )
  }
}

export interface BlackFrameConfig {
  readonly serial: string
}

// ponytail: parent-process entry point. Opens a fresh device, pushes the
// black frame, closes. All errors are non-fatal — the device may be gone,
// the daemon may be mid-shutdown, the operator may have unplugged the cable.
export const pushBlackFrameToDevice = async (
  config: BlackFrameConfig,
  logger: pino.Logger,
): Promise<void> => {
  let device: StreamDeckDevice | null = null
  try {
    device = await connectStreamDeck({ serial: config.serial })
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, serial: config.serial },
      "black-frame: failed to connect to device (non-fatal)",
    )
    return
  }
  try {
    await pushBlackFrame(device, logger)
  } finally {
    try {
      await device.close()
    } catch {
      void 0
    }
  }
}
