import 'next-auth'
import type { RoleInfo } from '@telamonjs/auth'

// The session contract of @telamonjs/auth (createAuthCallbacks in src/auth.ts,
// decoded by apps/api's JwtAuthGuard): `role` is a RoleInfo — its `code` is the
// Prisma RoleName ('ADMIN' | 'USER').
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: RoleInfo
      roles: RoleInfo[]
      permissions: string[]
      image: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string | null
    role: RoleInfo
    permissions: string[]
    image: string | null
  }
}
