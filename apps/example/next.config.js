import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import createNextIntlPlugin from 'next-intl/plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Auto-detect telamonjs-ui link mode via package.json (link: protocol = linked)
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
)
const isTelamonjsLinked =
  pkg.dependencies?.['@telamonjs/ui']?.startsWith('link:')

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
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // ESSENTIAL in link mode: without this Turbopack duplicates the
    // react-query instance in the linked package graph ("No QueryClient set").
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-table',
      'framer-motion',
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
