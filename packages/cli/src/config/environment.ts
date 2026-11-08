export class MissingEnvironmentVariableError extends Error {
  constructor(
    readonly variable: string,
    readonly configPath: string,
  ) {
    super(
      `Environment variable ${variable} is not set (at ${configPath || "<root>"})`,
    )
    this.name = "MissingEnvironmentVariableError"
  }
}

/** Resolve placeholders in values, never mapping keys or YAML source text. */
export const resolveEnvironmentVariables = (
  value: unknown,
  env: NodeJS.ProcessEnv = process.env,
  path = "",
): unknown => {
  if (typeof value === "string") {
    return value.replace(
      /\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g,
      (_match, name: string) => {
        const resolved = Object.hasOwn(env, name) ? env[name] : undefined
        if (resolved === undefined)
          throw new MissingEnvironmentVariableError(name, path)
        return resolved
      },
    )
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      resolveEnvironmentVariables(item, env, `${path}[${index}]`),
    )
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveEnvironmentVariables(item, env, path ? `${path}.${key}` : key),
      ]),
    )
  }
  return value
}
