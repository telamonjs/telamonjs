# @telamonjs/auth

The NextAuth v5 ↔ NestJS bridge. This package owns the **shape of the session
token** (an `@auth/core` JWE), not your login flow: your app's `authorize()`
still checks credentials. The Next side gets canonical `jwt`/`session`
callbacks, the Nest side gets a guard that decodes the same JWE and attaches a
typed `AuthUser` to the request, and both share **revocable impersonation**.

Zero runtime dependencies · dual ESM/CJS · `sideEffects: false`.

## Install

<!-- generated:peers -->
```bash
pnpm add @telamonjs/auth @auth/core
```

| Peer dependency | Range |
| --- | --- |
| `@auth/core` | `^0.34.0` |
| `@nestjs/common` (optional) | `^10.0.0 \|\| ^11.0.0` |
| `@nestjs/core` (optional) | `^10.0.0 \|\| ^11.0.0` |
<!-- /generated:peers -->

The Nest peers are only needed for `@telamonjs/auth/nest`. Set `AUTH_SECRET`
(or `NEXTAUTH_SECRET`) on both sides.

## Next side: compose over the base callbacks

```ts
import NextAuth from 'next-auth'
import { createAuthCallbacks } from '@telamonjs/auth/next'

const base = createAuthCallbacks()

export const { handlers, auth } = NextAuth({
  // ...providers with your own authorize()...
  callbacks: {
    jwt: async args => { const token = await base.jwt(args); /* extend */ return token },
    session: base.session,
  },
})
```

The session carries `SessionClaims`: `id`, `email`, `role`, `roles[]`,
`permissions[]` and `accessToken`, the same claims the Nest guard reads.

## Nest side: one line

```ts
import { createJwtAuthGuard, Public } from '@telamonjs/auth/nest'

export const JwtAuthGuard = createJwtAuthGuard()
```

The guard reads the token from `Authorization: Bearer`, then `?token=` (for
EventSource/SSE, which can't send headers), then the NextAuth cookies. Cookie
decoding is salt-aware (`__Secure-` names under HTTPS) and reassembles chunked
cookies. Opt a route out with `@Public()`.

## Impersonation

```ts
import { createImpersonationToken } from '@telamonjs/auth'

const token = await createImpersonationToken({ target, actor, logId: log.id })
```

The impersonation token **is** the API credential: the callbacks swap
`accessToken` too, so impersonation is not cosmetic. Wire the cookies through
`createAuthCallbacks({ getImpersonationCookies, clearImpersonationCookies })`.
For immediate revocation, pass `isImpersonationActive` to the guard; tokens
without a `logId` are then rejected:

```ts
createJwtAuthGuard({
  isImpersonationActive: async logId =>
    !!(await prisma.impersonationLog.findFirst({ where: { id: logId, endedAt: null } })),
})
```

`ImpersonationBanner` and `ImpersonationDialog` in `@telamonjs/ui` are the UI side.

## Session freshness & revocation

Permissions live in the token, so DB changes apply at the next login. To
apply them sooner, or to revoke every session of a user, the `jwt` callback
stamps `authTime`/`accessAt` at login and `sessionState(token, marks)` compares
them with two per-user timestamps your app keeps:

```ts
import { sessionState } from '@telamonjs/auth'

sessionState(payload, { revokedAt: user.sessionsRevokedAt, accessChangedAt: user.accessChangedAt })
// → 'revoked' | 'stale' | 'fresh'
```

On the Nest side, subclass the guard and override `resolveUser` (its return
becomes `request.user`, `null` is a 401); `allowQueryToken` turns `?token=` off
outside SSE routes. Full recipe on the docs site.

## Core (isomorphic)

```ts
encodeSessionToken(payload, config?)   // JwtPayload → JWE string
decodeSessionToken(token, config?)     // → JwtPayload | null (invalid or expired)
payloadToAuthUser(payload)             // claims → typed AuthUser
```

`TokenConfig` is `{ secret?, salt?, maxAge? }`. Defaults: salt
`'authjs.session-token'` (`DEFAULT_SALT`), maxAge 24 h (`DEFAULT_MAX_AGE`),
impersonation 1 h (`DEFAULT_IMPERSONATION_MAX_AGE`).

`AuthUser` structurally satisfies `UserWithPermissions` from
[`@telamonjs/permissions`](https://www.npmjs.com/package/@telamonjs/permissions),
with no dependency between the packages. Order the guards as
`@UseGuards(JwtAuthGuard, PermissionsGuard)`.

## Entry points

<!-- generated:entries -->
- `@telamonjs/auth`
- `@telamonjs/auth/nest`
- `@telamonjs/auth/next`

Every name each entry point exports, runtime and types: [Public API index](https://github.com/telamonjs/telamonjs/blob/main/docs/exports.md).
<!-- /generated:entries -->

## Full docs

**Full docs →** [the auth page of the docs site](https://github.com/telamonjs/telamonjs/tree/main/apps/docs/content/docs/packages)
(MDX sources, readable on GitHub).
