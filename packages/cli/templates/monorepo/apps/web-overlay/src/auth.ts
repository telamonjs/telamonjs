import { cache } from 'react'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { sessionState } from '@telamonjs/auth'
import { createAuthCallbacks } from '@telamonjs/auth/next'
import { prisma } from '{{scope}}/shared/prisma'
import { loadAccess } from '{{scope}}/shared/rbac'
import bcrypt from 'bcryptjs'

// Canonical claim-copy of @telamonjs/auth: the same token contract that
// apps/api's JwtAuthGuard decodes, plus `authTime`/`accessAt` stamped at
// login. The `jwt` callback below composes the session-freshness recipe on top.
const base = createAuthCallbacks()

// `auth()` runs the jwt callback on every call: one lookup by primary key,
// cached per request (React `cache`) so a render doesn't repeat it.
const loadMarks = cache((userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { active: true, accessChangedAt: true, sessionsRevokedAt: true },
  })
)

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

        if (!user || !user.active) {
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
          // The session contract (SessionClaims of @telamonjs/auth): roles and
          // the union of their permission codes, materialized into the JWT —
          // apps/api's PermissionsGuard reads the same `permissions[]`.
          ...(await loadAccess(prisma, user.id)),
        }
      },
    }),
  ],
  callbacks: {
    async jwt(args) {
      const token = await base.jwt(args)
      if (args.user) {
        // Fresh login. authorize() read the claims before base.jwt stamped
        // `accessAt` with the clock, so a role change committing in between would
        // look older than them: count them as older than any mark instead.
        // ponytail: a user with an access mark pays one recompute after signing in
        token.accessAt = 0
        return token
      }
      const marks = await loadMarks(token.id as string)
      if (!marks?.active) return null // deleted or deactivated: signs out
      const state = sessionState(token, {
        revokedAt: marks.sessionsRevokedAt,
        accessChangedAt: marks.accessChangedAt,
      })
      if (state === 'revoked') return null
      if (state === 'stale') {
        // Roles/permissions changed since the claims were computed: recompute
        // them (same source as authorize) and move only `accessAt` — never
        // `authTime`, or a revoked session would come back. The cookie is
        // re-issued with the fresh claims, so apps/api sees them too.
        Object.assign(token, await loadAccess(prisma, token.id as string), {
          // As new as the mark read above, never the clock: a change that
          // commits while loadAccess runs leaves the token stale
          accessAt: marks.accessChangedAt?.getTime() ?? 0,
        })
      }
      return token
    },
    session: base.session,
  },
})
