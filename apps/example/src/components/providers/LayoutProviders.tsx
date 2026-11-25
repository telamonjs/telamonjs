'use client'

import React, { useCallback } from 'react'
import { AdminShell, PermissionsProvider, Sonner as Toaster } from '@telamonjs/ui'
import { menuConfig } from '@/config/menu'
import { can } from '@/lib/permissions'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'

interface LayoutProvidersProps {
  children: React.ReactNode
  session: Session | null
}

export function LayoutProviders({ children, session }: LayoutProvidersProps) {
  const router = useRouter()
  // One checker for the whole shell: menu items with `permission` and every
  // CrudConfig `permissions` read it. Hiding is UX only — the Route Handlers
  // check again (requirePermission).
  const user = session?.user
  const check = useCallback((permission: string) => can(user, permission), [user])

  const handleSignOut = () => {
    router.push('/sign-out')
  }

  return (
    <PermissionsProvider can={check}>
      <AdminShell
        menuConfig={menuConfig}
        session={
          user
            ? {
                user: {
                  name: user.name ?? undefined,
                  email: user.email ?? undefined,
                  role: user.role,
                },
              }
            : undefined
        }
        systemName="example"
        logoUrl="/logo.png"
        compactLogoUrl="/icon-compact.png"
        onSignOut={handleSignOut}
      >
        {children}
      </AdminShell>
      <Toaster />
    </PermissionsProvider>
  )
}
