export type ScopeKind = "addon" | "button"

export interface Scope<T = unknown> {
  get(key: string): T | undefined
  set(key: string, value: T): void
  update(key: string, fn: (current: T | undefined) => T): T
  clear(): void
  snapshot(): Readonly<Record<string, T>>
}

export interface Store {
  addonScope<T = unknown>(addonName: string): Scope<T>
  buttonScope<T = unknown>(addonName: string, buttonId: string): Scope<T>
  clearAddon(addonName: string): void
  clearButton(addonName: string, buttonId: string): void
  clearAll(): void
}

const buildScope = <T>(bucket: Map<string, T>): Scope<T> => {
  const get = (key: string): T | undefined => bucket.get(key)
  const set = (key: string, value: T): void => {
    bucket.set(key, value)
  }
  const update = (key: string, fn: (current: T | undefined) => T): T => {
    const next = fn(bucket.get(key))
    bucket.set(key, next)
    return next
  }
  const clear = (): void => {
    bucket.clear()
  }
  const snapshot = (): Readonly<Record<string, T>> => {
    const result: Record<string, T> = {}
    for (const [key, value] of bucket) result[key] = value
    return Object.freeze(result)
  }
  return { get, set, update, clear, snapshot }
}

export const createStore = (): Store => {
  const addonScopes = new Map<string, Map<string, unknown>>()
  const buttonScopes = new Map<string, Map<string, Map<string, unknown>>>()

  const addonBucket = (addonName: string): Map<string, unknown> => {
    let bucket = addonScopes.get(addonName)
    if (bucket === undefined) {
      bucket = new Map()
      addonScopes.set(addonName, bucket)
    }
    return bucket
  }

  const buttonBucket = (
    addonName: string,
    buttonId: string,
  ): Map<string, unknown> => {
    let addonMap = buttonScopes.get(addonName)
    if (addonMap === undefined) {
      addonMap = new Map()
      buttonScopes.set(addonName, addonMap)
    }
    let bucket = addonMap.get(buttonId)
    if (bucket === undefined) {
      bucket = new Map()
      addonMap.set(buttonId, bucket)
    }
    return bucket
  }

  const store: Store = {
    addonScope: <T = unknown>(addonName: string): Scope<T> =>
      buildScope<T>(addonBucket(addonName) as Map<string, T>),
    buttonScope: <T = unknown>(addonName: string, buttonId: string): Scope<T> =>
      buildScope<T>(buttonBucket(addonName, buttonId) as Map<string, T>),
    clearAddon: (addonName: string) => {
      addonScopes.delete(addonName)
    },
    clearButton: (addonName: string, buttonId: string) => {
      buttonScopes.get(addonName)?.delete(buttonId)
    },
    clearAll: () => {
      addonScopes.clear()
      buttonScopes.clear()
    },
  }

  return store
}
