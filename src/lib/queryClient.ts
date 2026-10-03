import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchInterval: 10 * 60_000,
      refetchOnWindowFocus: true,
      retry: 3,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 15_000),
    },
  },
})

export const persister = createSyncStoragePersister({ storage: window.localStorage })
