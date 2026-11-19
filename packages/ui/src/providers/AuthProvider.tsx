'use client'

import { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'

interface AuthProviderProps {
  children: ReactNode
  // `any` kept intentionally: NextAuth session shape is augmented per-consumer
  // (module augmentation); passed straight through to next-auth's SessionProvider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session?: any
  refetchInterval?: number
  refetchOnWindowFocus?: boolean
}

export function AuthProvider({
  children,
  session,
  refetchInterval = 5 * 60,
  refetchOnWindowFocus = true,
}: AuthProviderProps) {
  return (
    <SessionProvider
      session={session}
      refetchInterval={refetchInterval}
      refetchOnWindowFocus={refetchOnWindowFocus}
    >
      {children}
    </SessionProvider>
  )
}

export type { AuthProviderProps }
