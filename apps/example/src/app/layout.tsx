import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getLocale, getMessages, getTimeZone } from 'next-intl/server'
import { AppProviders } from '@/components/providers/app-providers'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TelamonJS App',
  description: 'Template project generated with TelamonJS',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [locale, messages, timeZone] = await Promise.all([getLocale(), getMessages(), getTimeZone()])

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <AppProviders locale={locale} messages={messages} timeZone={timeZone}>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
