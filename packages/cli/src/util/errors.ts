export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`Not implemented: ${feature}`)
    this.name = "NotImplementedError"
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigError"
  }
}
