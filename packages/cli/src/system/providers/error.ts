export type ProviderErrorCode =
  | "NOT_AVAILABLE"
  | "TIMEOUT"
  | "EXEC_FAILED"
  | "PARSE_ERROR"
  | "UNSUPPORTED_PLATFORM"

export class ProviderError extends Error {
  readonly code: ProviderErrorCode

  constructor(code: ProviderErrorCode, message: string) {
    super(message)
    this.name = "ProviderError"
    this.code = code
  }
}
