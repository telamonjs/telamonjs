import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { pageTree } from '@/lib/source'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={pageTree}
      nav={{
        title: 'TelamonJS',
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
