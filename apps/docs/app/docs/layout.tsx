import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { pageTree } from '@/lib/source'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={pageTree}
      nav={{
        title: (
          <>
            <Image src="/logo-icon.svg" alt="" width={22} height={22} unoptimized />
            TelamonJS
          </>
        ),
        enabled: true,
        transparentMode: 'top',
      }}
      sidebar={{
        enabled: true,
        collapsible: true,
      }}
      links={[
        {
          text: 'GitHub',
          url: 'https://github.com/telamonjs/telamonjs',
          external: true,
        },
      ]}
    >
      {children}
    </DocsLayout>
  )
}
