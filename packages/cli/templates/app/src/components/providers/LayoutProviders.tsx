'use client'

import React from 'react'
import { AdminShell, Sonner as Toaster } from '@telamonjs/ui'
import { menuConfig } from '@/config/menu'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'

interface LayoutProvidersProps {
  children: React.ReactNode
  session: Session | null
}

export function LayoutProviders({ children, session }: LayoutProvidersProps) {
  const router = useRouter()

  const handleSignOut = () => {
    router.push('/sign-out')
  }

  return (
    <>
      <AdminShell
        menuConfig={menuConfig}
        session={
          session?.user
            ? {
                user: {
                  name: session.user.name ?? undefined,
                  email: session.user.email ?? undefined,
                  role: { name: session.user.role ?? undefined },
                },
              }
            : undefined
        }
        systemName="{{projectName}}"
        logoUrl="/logo.png"
        compactLogoUrl="/icon-compact.png"
        onSignOut={handleSignOut}
      >
        {children}
      </AdminShell>
      <Toaster />
    </>
  )
}
