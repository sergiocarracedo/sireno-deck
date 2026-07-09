import { createHash } from "node:crypto"

export const hashBuffer = (buf: Buffer): string =>
  createHash("sha1").update(buf).digest("hex").slice(0, 16)

export class BufferChangeTracker {
  private readonly last = new Map<number, string>()

  update(keyIndex: number, buf: Buffer): boolean {
    const hash = hashBuffer(buf)
    const previous = this.last.get(keyIndex)
    if (previous === hash) return false
    this.last.set(keyIndex, hash)
    return true
  }

  reset(): void {
    this.last.clear()
  }
}
