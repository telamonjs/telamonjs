/** PRD 068 item 12: the title can be a real heading (opt-in, default unchanged). */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageContent } from './PageContent'

describe('PageContent titleAs', () => {
  it('default keeps the title out of the heading outline (unchanged)', () => {
    render(<PageContent title='Relatório'>x</PageContent>)
    expect(screen.getByText('Relatório')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  for (const variant of ['card', 'plain'] as const) {
    it(`${variant}: titleAs='h2' renders an h2 with the same styling`, () => {
      render(
        <PageContent title='Relatório' titleAs='h2' variant={variant}>
          x
        </PageContent>
      )
      const heading = screen.getByRole('heading', { level: 2, name: 'Relatório' })
      expect(heading.className).toMatch(/font-(bold|semibold)/)
    })
  }
})
