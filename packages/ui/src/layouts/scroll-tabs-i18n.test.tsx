/**
 * PRD 068 item 13: the tab-strip scroll buttons read in pt-BR (they were
 * English in the pt-BR messages, and literal English in AdminForm).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../test/ui-mocks'
import { ContentTabs } from './content-tabs'
import { AdminForm } from '../components/forms/AdminForm'

// Overflowing strip: scrollWidth > clientWidth → the right arrow shows.
const props = ['scrollWidth', 'clientWidth'] as const
const saved = props.map(p => Object.getOwnPropertyDescriptor(HTMLElement.prototype, p))
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 1000 })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 100 })
})
afterAll(() => {
  props.forEach((p, i) => {
    const d = saved[i]
    if (d) Object.defineProperty(HTMLElement.prototype, p, d)
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[p]
  })
})

describe('scroll-tabs labels (pt-BR)', () => {
  it('ContentTabs', () => {
    render(
      <ContentTabs
        tabs={[
          { value: 'a', label: 'A', content: <div /> },
          { value: 'b', label: 'B', content: <div /> },
        ]}
      />
    )
    expect(screen.getByRole('button', { name: 'Rolar abas para a direita' })).toBeInTheDocument()
  })

  it('AdminForm section tabs', () => {
    render(
      <AdminForm
        useTabs
        action={async () => ({ success: true })}
        sections={[
          { label: 'Um', fields: [{ name: 'a', label: 'A', type: 'text' }] },
          { label: 'Dois', fields: [{ name: 'b', label: 'B', type: 'text' }] },
        ]}
      />
    )
    expect(screen.getByRole('button', { name: 'Rolar abas para a direita' })).toBeInTheDocument()
  })
})
