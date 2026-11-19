import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Redirects signed-out visitors away from /admin before any rendering. The
// admin layout re-checks (defense in depth); /api/* is not matched — each
// Route Handler does its own getCurrentUser() check.
export default auth((req) => {
  // `req.auth?.user`, not `req.auth`: an auth error sets `req.auth` to the
  // error body, which must not count as a session (fail closed).
  if (!req.auth?.user) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
  return NextResponse.next()
})

// Lives in src/ because the app uses src/app: Next.js ignores a root
// middleware.ts then. Node runtime because @/auth pulls in Prisma and bcrypt,
// which the Edge runtime can't load.
export const config = {
  runtime: 'nodejs',
  matcher: ['/admin/:path*'],
}
