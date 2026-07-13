const EXT_TO_MIME: Readonly<Record<string, string>> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  ico: "image/x-icon",
}

export const inferMimeFromPath = (path: string): string => {
  const dot = path.lastIndexOf(".")
  if (dot === -1 || dot === path.length - 1) return "application/octet-stream"
  const ext = path.slice(dot + 1).toLowerCase()
  return EXT_TO_MIME[ext] ?? "application/octet-stream"
}
