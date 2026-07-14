import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 1000, // 2 seconds
      gcTime: 0, // No cache persistence
      retry: (failureCount, error: any) => {
        // Don't retry on 401, 403, 404
        if (error?.statusCode === 401 || error?.statusCode === 403 || error?.statusCode === 404) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
