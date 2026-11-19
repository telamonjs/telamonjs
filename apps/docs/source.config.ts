import { defineDocs, defineConfig } from 'fumadocs-mdx/config'
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins'
import rehypePrettyCode from 'rehype-pretty-code'

export const docs = defineDocs({
  dir: 'content/docs',
})

export default defineConfig({
  mdxOptions: {
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          ...rehypeCodeDefaultOptions,
          theme: {
            dark: 'github-dark',
            light: 'github-light',
          },
          keepBackground: false,
        },
      ],
    ],
    remarkPlugins: [
      // GFM (GitHub Flavored Markdown) is enabled by default
    ],
  },
})
