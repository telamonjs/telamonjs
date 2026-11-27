import { auth } from '@/auth'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'

// Redirects signed-out visitors away from /admin before any rendering. The
// admin layout re-checks (defense in depth).
const adminGate = auth((req, _event: NextFetchEvent) => {
  // `req.auth?.user`, not `req.auth`: an auth error sets `req.auth` to the
  // error body, which must not count as a session (fail closed).
  if (!req.auth?.user) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
  return NextResponse.next()
})

// The session cookie is SameSite=Lax, which browsers still send on a form or
// no-cors POST from another origin of the same site (a sibling subdomain,
// another localhost port). A write to /api/* whose Origin is not this app is
// refused; requests without an Origin (curl, server to server) pass. Auth.js
// routes (/api/auth/*) have their own CSRF token. Each Route Handler still
// checks its own permission (requirePermission).
function crossOriginWrite(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (origin === null || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return false
  if (req.nextUrl.pathname.startsWith('/api/auth/')) return false
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try {
    return new URL(origin).host !== host
  } catch {
    return true // "null" or a malformed Origin
  }
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return crossOriginWrite(req)
      ? NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 })
      : NextResponse.next()
  }
  return adminGate(req, event)
}

// Lives in src/ because the app uses src/app: Next.js ignores a root
// middleware.ts then. Node runtime because @/auth pulls in Prisma and bcrypt,
// which the Edge runtime can't load. /api/* runs without the session lookup.
export const config = {
  runtime: 'nodejs',
  matcher: ['/admin/:path*', '/api/:path*'],
}
