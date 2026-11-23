import NextAuth, { type Session } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import { createAuthCallbacks } from '@telamonjs/auth/next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Canonical claim-copy of @telamonjs/auth: id/role/roles/permissions into the
// token and back into session.user, plus `authTime`/`accessAt` stamped at
// login. To revoke sessions or refresh stale roles, compose over these
// callbacks — see "Session freshness & revocation" in the @telamonjs/auth docs.
const base = createAuthCallbacks()

export const { handlers, auth, signIn, signOut } = NextAuth({
  // @auth/prisma-adapter's return type lags next-auth's Adapter type across
  // their independent majors; both model the same runtime shape.
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  // Self-hosted (Docker / `next start` behind a proxy): Auth.js only trusts
  // the Host header by itself on Vercel/CF Pages or outside production. Without
  // this, production fails every auth call with `UntrustedHost`. Pin the public
  // URL with AUTH_URL/NEXTAUTH_URL in production so the Host header isn't used.
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/sign-in',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        })

        if (!user || !user.ativo) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          // The session contract (SessionClaims of @telamonjs/auth): the role
          // enum becomes a RoleInfo, and `permissions` stays empty until the
          // app materializes RBAC into it (@telamonjs/permissions).
          role: { id: user.role, name: user.role, code: user.role },
          permissions: [],
        }
      },
    }),
  ],
  callbacks: {
    jwt: base.jwt,
    // The package types its callbacks structurally (plain records), not with
    // next-auth's interfaces: spread the session into a plain object, and type
    // the result as the Session declared in src/types/next-auth.d.ts.
    session: ({ session, token }) =>
      base.session({ session: { ...session, user: { ...session.user } }, token }) as unknown as Session,
  },
})
