'use client'

import { ReactNode, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

interface QueryProviderProps {
  children: ReactNode
  refetchOnWindowFocus?: boolean
  staleTime?: number
  gcTime?: number
}

export function QueryProvider({
  children,
  refetchOnWindowFocus = false,
  staleTime = 5 * 60 * 1000,
  gcTime = 10 * 60 * 1000,
}: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus,
            staleTime,
            gcTime,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export type { QueryProviderProps }
