import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion'

const renderAcc = (headingLevel?: 2 | 3 | 4 | 5 | 6) =>
  render(
    <Accordion type='single' collapsible>
      <AccordionItem value='a'>
        <AccordionTrigger headingLevel={headingLevel}>Title</AccordionTrigger>
        <AccordionContent>Body</AccordionContent>
      </AccordionItem>
    </Accordion>,
  )

describe('AccordionTrigger headingLevel', () => {
  it('keeps h3 by default', () => {
    renderAcc()
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
  })

  it('renders the requested level', () => {
    renderAcc(2)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })
})
