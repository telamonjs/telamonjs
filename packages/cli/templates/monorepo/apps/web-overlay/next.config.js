import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import createNextIntlPlugin from 'next-intl/plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Auto-detect telamonjs-ui link mode via package.json (file: or link: = linked,
// see `telamonjs link`)
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
)
const isTelamonjsLinked =
  /^(file|link):/.test(pkg.dependencies?.['@telamonjs/ui'] ?? '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Explicit transpilation of telamonjs-ui (client-side only)
  transpilePackages: ['@telamonjs/ui'],
  // {{scope}}/shared uses Prisma/Node built-ins — it must never enter the
  // server bundle (webpack would try to bundle fs/crypto/etc for the edge
  // runtime).
  serverExternalPackages: ['{{scope}}/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // ESSENTIAL in link mode: without this Turbopack duplicates the
    // react-query instance in the linked package graph ("No QueryClient set").
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-table',
      '@telamonjs/ui',
      'next-intl',
    ],
  },
  // Dev/standalone convenience: without Traefik in front, `/v1` on the
  // Next.js port would 404 — proxy it to apps/api so `src/lib/api/client.ts`
  // works the same in both setups. Traefik (production, traefik/dynamic.yml)
  // takes over this exact same path and this rewrite becomes a no-op there.
  async rewrites() {
    const apiPort = process.env.API_PORT || {{apiPort}}
    return [{ source: '/v1/:path*', destination: `http://localhost:${apiPort}/v1/:path*` }]
  },
  // Turbopack — auto-detect: link mode needs a root that covers the local
  // telamonjs checkout (adjust the depth to match your folder layout);
  // package mode uses the monorepo root (two levels up, where
  // pnpm-workspace.yaml lives) — without this Turbopack detects the wrong
  // lockfile.
  // Do NOT use turbopack.resolveAlias with an absolute path (Turbopack rejects it).
  turbopack: {
    root: path.resolve(__dirname, isTelamonjsLinked ? '../../..' : '../..'),
  },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
