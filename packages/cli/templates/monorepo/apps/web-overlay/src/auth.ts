import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createAuthCallbacks } from '@telamonjs/auth/next'
import { prisma } from '{{scope}}/shared/prisma'
import bcrypt from 'bcryptjs'

// Canonical claim-copy of @telamonjs/auth: the same token contract that
// apps/api's JwtAuthGuard decodes, plus `authTime`/`accessAt` stamped at
// login. To revoke sessions or refresh stale roles, compose over these
// callbacks — see "Session freshness & revocation" in the @telamonjs/auth docs.
const base = createAuthCallbacks()

// No PrismaAdapter here: the session strategy is 'jwt' (the API decodes the
// same cookie independently — see apps/api/CLAUDE.md), so an adapter tied
// to the database isn't needed to issue or read sessions.
export const { handlers, auth, signIn, signOut } = NextAuth({
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
    session: base.session,
  },
})
