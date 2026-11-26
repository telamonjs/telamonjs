/**
 * sanitize-html
 *
 * Boundary sanitization for any HTML rendered via `dangerouslySetInnerHTML`
 * or fed into a WYSIWYG editor inside telamonjs-ui. Because this is a published
 * component library, a consumer may pass user-controlled content into props
 * like `CardLink.icon` (inline SVG) or `RichTextEditor.value` (rich HTML).
 * Sanitizing here prevents those props from becoming XSS sinks.
 *
 * Uses browser-side `dompurify`. The only consumers (`CardLink`, `RichTextEditor`)
 * are `'use client'` components, so sanitization runs in the browser where a real
 * DOM exists. We intentionally do NOT use `isomorphic-dompurify`/jsdom on the
 * server: jsdom reads its `browser/default-stylesheet.css` from disk at runtime,
 * which breaks Next.js server bundles (prerender ENOENT) — especially under
 * `transpilePackages`, where `serverExternalPackages` cannot externalize it.
 * Without a DOM (SSR) both functions fail closed and return `''`: hydration does
 * not rewrite server HTML, so raw markup emitted there would stay live. Callers
 * insert the sanitized string on the client (see `CardLink`).
 *
 * NOTE (lazy-dep guard): DOMPurify is a light, eager dependency. It is NOT
 * one of the heavy lazy-by-default deps (@tiptap, recharts) tracked by
 * `scripts/check-lazy-deps.mjs`, so importing it statically here is fine.
 */

import DOMPurify from 'dompurify'

/** True only where a real DOM exists (browser/jsdom). DOMPurify needs a window. */
const canSanitize = typeof window !== 'undefined'

/**
 * Sanitize an inline-SVG (or generic safe-markup) string.
 *
 * Allows SVG elements/attributes and SVG filters so legitimate inline icons
 * keep rendering, while stripping `<script>`, event-handler attributes
 * (`onerror`, `onclick`, ...) and other JS-execution vectors.
 *
 * Intended for `CardLink.icon` when passed as a raw SVG string.
 */
export function sanitizeSvg(input: string): string {
  if (!input) return ''
  if (!canSanitize) return ''
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true, html: true },
  })
}

/**
 * Sanitize a rich-text HTML string for the set of tags/attributes the
 * TipTap-based `RichTextEditor` produces (paragraphs, marks, links, lists,
 * headings, images, tables, code/blockquote/hr).
 *
 * Strips `<script>` and event-handler attributes while preserving benign
 * formatting. `target`/`rel` on links and safe `img` attributes are kept.
 */
export function sanitizeRichText(input: string): string {
  if (!input) return ''
  if (!canSanitize) return ''
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      // block
      'p',
      'div',
      'span',
      'br',
      'hr',
      'blockquote',
      'pre',
      'code',
      // headings
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      // marks
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'mark',
      'sub',
      'sup',
      // lists
      'ul',
      'ol',
      'li',
      // links / media
      'a',
      'img',
      // tables
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'colgroup',
      'col',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'title',
      'src',
      'alt',
      'width',
      'height',
      'class',
      'style',
      'colspan',
      'rowspan',
      'start',
      'type',
      'data-type',
      'colwidth',
    ],
    // DOMPurify already forbids javascript: URIs by default; keep links safe.
    ALLOW_DATA_ATTR: false,
  })
}
