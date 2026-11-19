import 'next-auth'

// A literal union instead of Prisma's RoleName: this app no longer depends
// on @prisma/client directly (it lives in {{scope}}/shared).
type Role = 'ADMIN' | 'USER'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: string
      image: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string | null
    role: Role
    image: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
  }
}
