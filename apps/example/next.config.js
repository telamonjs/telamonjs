import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import createNextIntlPlugin from 'next-intl/plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Auto-detect telamonjs-ui link mode via package.json (file: or link: = linked,
// see `telamonjs link`; workspace: = the example app inside the telamonjs repo)
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
)
const isTelamonjsLinked =
  /^(file|link|workspace):/.test(pkg.dependencies?.['@telamonjs/ui'] ?? '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    // Hosts next/image may optimize remote images from. /_next/image is
    // public: the server fetches whatever host is listed here, so name each
    // one (e.g. { protocol: 'https', hostname: 'cdn.example.com' }) and never
    // use a wildcard like '**'.
    remotePatterns: [],
  },
  // Explicit transpilation of telamonjs-ui (client-side only)
  transpilePackages: ['@telamonjs/ui'],
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
  // Turbopack — auto-detect: link mode needs a root that covers the local
  // telamonjs checkout (adjust the depth to match your folder layout);
  // package mode uses the project's own root.
  // Do NOT use turbopack.resolveAlias with an absolute path (Turbopack rejects it).
  turbopack: {
    root: path.resolve(__dirname, isTelamonjsLinked ? '../..' : '.'),
  },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
