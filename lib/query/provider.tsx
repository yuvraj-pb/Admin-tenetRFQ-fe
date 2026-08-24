"use client"

import React, { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const ReactQueryDevtools = React.lazy(() =>
  import("@tanstack/react-query-devtools").then((d) => ({
    default: d.ReactQueryDevtools,
  })),
)

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 1000,
            gcTime: 0,
            retry: (failureCount, error: any) => {
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
      }),
  )
  const [showDevtools, setShowDevtools] = useState(false)

  useEffect(() => {
    setShowDevtools(process.env.NODE_ENV === "development")
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </React.Suspense>
      )}
    </QueryClientProvider>
  )
}
