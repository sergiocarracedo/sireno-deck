import { connectStreamDeck, type StreamDeckDevice } from "@/device/stream-deck"

import type pino from "pino"

// ponytail: extracted from RealOutputClient.pushBlackFrame so any caller
// (current or future) can push a black frame WITHOUT going through the full
// daemon init. Today the daemon pushes a black frame on its own teardown in
// runPipeline's finally block; the helper is preserved for that single use
// site and stays best-effort because the device may be unplugged at the
// moment of exit.
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
    // ponytail: allow queued image writes to drain before the caller closes
    // the device; brightness is intentionally left unchanged.
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
