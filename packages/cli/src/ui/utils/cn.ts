export const cn = (...inputs: (string | null | undefined)[]): string => {
  const resolved = Array.isArray(inputs[0]) ? inputs[0] : inputs
  return resolved.filter(Boolean).join(' ')
}
