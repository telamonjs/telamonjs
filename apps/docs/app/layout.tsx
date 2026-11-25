import './globals.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { ThemeProvider } from '@/components/theme-provider'
import { DocsI18nProvider } from '@/components/i18n-provider'

export const metadata: Metadata = {
  metadataBase: new URL('https://telamonjs.com'),
  title: {
    template: '%s | TelamonJS',
    default: 'TelamonJS · The admin framework for Next.js',
  },
  description:
    'Declare what a module is, and TelamonJS holds up the list, the forms, the dialogs, the permissions and the data layer around it.',
  keywords: [
    'react',
    'nextjs',
    'admin',
    'dashboard',
    'components',
    'ui',
    'typescript',
    'telamonjs',
  ],
  authors: [
    {
      name: 'Marcos Tullyo',
      url: 'https://github.com/telamonjs/telamonjs',
    },
  ],
  creator: 'Marcos Tullyo',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'TelamonJS · The admin framework for Next.js',
    description:
      'Declare what a module is, and TelamonJS holds up the list, the forms, the dialogs, the permissions and the data layer around it.',
    siteName: 'TelamonJS Docs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TelamonJS · The admin framework for Next.js',
    description:
      'Declare what a module is, and TelamonJS holds up the list, the forms, the dialogs, the permissions and the data layer around it.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: { icon: '/logo-icon.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang='en'
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <DocsI18nProvider>
            <RootProvider>{children}</RootProvider>
          </DocsI18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
