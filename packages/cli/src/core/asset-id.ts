import { basename } from "node:path"

import { createHash } from "node:crypto"

const HASH_BYTES = 8

export const makeAssetId = (
  fullPath: string,
  filesize: number,
  mtime: number,
): string => {
  const hash = createHash("sha256")
    .update(fullPath)
    .update("\0")
    .update(String(filesize))
    .update("\0")
    .update(String(mtime))
    .digest("hex")
    .slice(0, HASH_BYTES * 2)
  return `${basename(fullPath)}-${hash}`
}
