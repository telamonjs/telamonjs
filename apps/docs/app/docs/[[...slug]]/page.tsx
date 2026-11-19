import { notFound } from 'next/navigation'
import { getPage, getPages } from '@/lib/source'
import type { Metadata } from 'next'
import { DocsPage, DocsBody } from 'fumadocs-ui/page'
import { useMDXComponents as getMDXComponents } from '@/lib/mdx-components'

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  const page = getPage(slug)

  if (!page) notFound()

  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsBody>
        <h1>{page.data.title}</h1>
        {page.data.description && (
          <p className='text-lg text-muted-foreground mb-8'>
            {page.data.description}
          </p>
        )}
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return getPages().map(page => ({
    slug: page.slugs,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getPage(slug)

  if (!page) notFound()

  return {
    title: page.data.title,
    description: page.data.description,
  }
}
