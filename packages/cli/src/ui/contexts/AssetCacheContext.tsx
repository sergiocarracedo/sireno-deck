import { createContext, useCallback, useContext, useRef } from "react"

export type AssetCache = Map<string, string>

export const AssetCacheContext = createContext<AssetCache>(new Map())

export const useAssetCache = (): AssetCache => {
  return useContext(AssetCacheContext)
}

interface UseAssetCacheMutationsResult {
  setAsset: (id: string, data: string) => void
  clearAssets: () => void
}

export const useAssetCacheMutations = (): UseAssetCacheMutationsResult => {
  const cache = useContext(AssetCacheContext)
  const setAsset = useCallback(
    (id: string, data: string) => {
      cache.set(id, data)
    },
    [cache],
  )
  const clearAssets = useCallback(() => {
    cache.clear()
  }, [cache])
  return { setAsset, clearAssets }
}

interface AssetCacheProviderProps {
  children: React.ReactNode
}

export const AssetCacheProvider = ({
  children,
}: AssetCacheProviderProps): React.ReactElement => {
  const cacheRef = useRef<AssetCache>(new Map())
  return (
    <AssetCacheContext.Provider value={cacheRef.current}>
      {children}
    </AssetCacheContext.Provider>
  )
}
