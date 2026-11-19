import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DialogHeaderContent } from './DialogHeaderContent'
import type { DialogHeaderConfig } from '../../types/dialog-header'

interface U {
  name: string
}
const base: DialogHeaderConfig<U> = { icon: 'User', iconColor: 'blue', title: 'T' }

describe('DialogHeaderContent subtitle as ReactNode (7.10)', () => {
  it('renders a ReactNode subtitle as is', () => {
    render(
      <DialogHeaderContent<U>
        item={{ name: 'Ana' }}
        mode='view'
        config={{ ...base, subtitle: <b data-testid='sub'>rich</b> }}
      />
    )
    expect(screen.getByTestId('sub')).toHaveTextContent('rich')
  })

  it('renders a ReactNode returned by the function form', () => {
    render(
      <DialogHeaderContent<U>
        item={{ name: 'Ana' }}
        mode='view'
        config={{ ...base, subtitle: u => <span data-testid='sub'>{u.name}</span> }}
      />
    )
    expect(screen.getByTestId('sub')).toHaveTextContent('Ana')
  })

  it('still renders strings and renders nothing for null', () => {
    const { rerender } = render(
      <DialogHeaderContent<U> item={{ name: 'Ana' }} mode='view' config={{ ...base, subtitle: 'plain' }} />
    )
    expect(screen.getByText('plain')).toBeInTheDocument()
    rerender(
      <DialogHeaderContent<U> item={{ name: 'Ana' }} mode='view' config={{ ...base, subtitle: () => null }} />
    )
    expect(screen.queryByText('plain')).not.toBeInTheDocument()
  })
})
