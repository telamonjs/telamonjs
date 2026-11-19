import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['fumadocs-ui', 'fumadocs-core'],

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/docs',
        permanent: false,
      },
      // Pages merged or removed in the docs restructure
      { source: '/docs/components/donut-chart', destination: '/docs/components/pie-chart#donut', permanent: true },
      { source: '/docs/components/radar-chart', destination: '/docs/components/chart-widget#charts-not-wrapped-by-the-package-use-recharts-directly', permanent: true },
      { source: '/docs/components/composed-chart', destination: '/docs/components/chart-widget#charts-not-wrapped-by-the-package-use-recharts-directly', permanent: true },
      { source: '/docs/components/zustand-form-server', destination: '/docs/components/zustand-form#server-component-pages-zustandformserver', permanent: true },
      { source: '/docs/patterns/detail-components', destination: '/docs/patterns/detail-page', permanent: true },
      { source: '/docs/patterns/page-config', destination: '/docs/patterns/admin-module-structure', permanent: true },
      { source: '/docs/api-reference', destination: '/docs/reference/exports', permanent: true },
    ]
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default withMDX(config)
