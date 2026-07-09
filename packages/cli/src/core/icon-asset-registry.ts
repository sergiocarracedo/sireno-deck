export interface Asset {
  readonly id: string
  readonly filename: string
  readonly data: string
}

const assets: Asset[] = []

export const registerIconForDeck = (
  _buttons: ReadonlyArray<unknown>,
  _resolverOptions: unknown,
): void => {
  // Stub: icon registration not yet implemented
}

export const getAllAssets = (): ReadonlyArray<Asset> => assets
