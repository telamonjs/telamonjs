import 'next-auth'
import type { RoleInfo } from '@telamonjs/auth'

// The session contract of @telamonjs/auth (createAuthCallbacks in src/auth.ts):
// `roles` are the user's Role rows ({ id, code, name }), `role` the primary one
// (absent for a user without roles) and `permissions` the union of the
// roles' permission codes — check them with `can()` from src/lib/permissions.ts.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role?: RoleInfo
      roles: RoleInfo[]
      permissions: string[]
      image: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string | null
    role?: RoleInfo
    roles: RoleInfo[]
    permissions: string[]
    image: string | null
  }
}
