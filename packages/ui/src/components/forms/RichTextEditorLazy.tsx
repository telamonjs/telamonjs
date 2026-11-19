/**
 * RichTextEditorLazy - Lazy-loaded RichTextEditor
 *
 * Reduces initial bundle size by ~60-80 KB (Tiptap + extensions).
 * Uses React.lazy + Suspense for code splitting.
 *
 * @example
 * ```tsx
 * import { RichTextEditorLazy } from '@telamonjs/ui'
 *
 * <RichTextEditorLazy
 *   value={content}
 *   onChange={(html) => setContent(html)}
 * />
 * ```
 */

'use client'

import React, { Suspense } from 'react'
import { Skeleton } from '../../ui/skeleton'
import type { RichTextEditorProps } from './RichTextEditor'

// Lazy load the heavy Tiptap-based editor
const RichTextEditorImpl = React.lazy(() =>
  import('./RichTextEditor').then(mod => ({ default: mod.RichTextEditor }))
)

/**
 * Loading skeleton for RichTextEditor
 */
function RichTextEditorSkeleton({ minHeight = 200 }: { minHeight?: number }) {
  return (
    <div className='rounded-md border border-input bg-background'>
      {/* Toolbar skeleton */}
      <div className='flex flex-wrap items-center gap-1 border-b p-2'>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={`toolbar-${i}`} className='h-8 w-8' />
        ))}
      </div>
      {/* Editor area skeleton */}
      <div className='p-4' style={{ minHeight }}>
        <Skeleton className='mb-2 h-4 w-3/4' />
        <Skeleton className='mb-2 h-4 w-1/2' />
        <Skeleton className='h-4 w-2/3' />
      </div>
    </div>
  )
}

/**
 * Lazy-loaded RichTextEditor with automatic Suspense fallback
 *
 * Use this instead of RichTextEditor when:
 * - The editor is not immediately visible (e.g., in a dialog/tab)
 * - Bundle size is critical
 * - Initial page load performance is a priority
 */
export function RichTextEditorLazy(props: RichTextEditorProps) {
  return (
    <Suspense fallback={<RichTextEditorSkeleton minHeight={props.minHeight} />}>
      <RichTextEditorImpl {...props} />
    </Suspense>
  )
}

// Re-export types for convenience
export type { RichTextEditorProps }
