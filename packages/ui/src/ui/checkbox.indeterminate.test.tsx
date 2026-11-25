import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Checkbox } from './checkbox'

// The global setup mocks this primitive with a native input; test the real one
vi.unmock('./checkbox')

describe('Checkbox (real primitive)', () => {
  it('draws a dash, not a check, when indeterminate', () => {
    render(<Checkbox checked='indeterminate' aria-label='Some' />)
    const box = screen.getByRole('checkbox', { name: 'Some' })
    expect(box).toHaveAttribute('data-state', 'indeterminate')
    expect(box.className).toContain('group')
    // Both icons render; CSS on the root's data-state shows only one
    expect(screen.getByTestId('icon-minus').getAttribute('class')).toContain('group-data-[state=indeterminate]:block')
    expect(screen.getByTestId('icon-check').getAttribute('class')).toContain('group-data-[state=indeterminate]:hidden')
  })

  it('shows the check (not the dash) when checked', () => {
    render(<Checkbox checked aria-label='All' />)
    expect(screen.getByTestId('icon-check').getAttribute('class')).not.toMatch(/(^|\s)hidden(\s|$)/)
    expect(screen.getByTestId('icon-minus').getAttribute('class')).toMatch(/(^|\s)hidden(\s|$)/)
  })
})
