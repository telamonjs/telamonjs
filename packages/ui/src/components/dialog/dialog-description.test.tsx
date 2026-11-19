import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreateDialog } from './create-dialog'
import { EditDialog } from './edit-dialog'
import { ViewDialog } from './view-dialog'

// Real Radix Dialog: aria-describedby wiring is what is under test
vi.unmock('../../ui/dialog')
vi.mock('../../hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/x',
  useSearchParams: () => new URLSearchParams(),
}))

interface Item extends Record<string, unknown> {
  id: string
  name: string
}
const fetchAction = vi.fn().mockResolvedValue({ id: '1', name: 'Ana' })
const sections = [
  { label: 'Dados', fields: [{ name: 'name', label: 'Nome', type: 'text' as const }] },
]
const headerConfig = { icon: 'Settings', title: 'Rich' }

function expectDescribed(text: string, srOnly: boolean) {
  const dialog = screen.getByRole('dialog')
  const el = screen.getByText(text)
  expect(dialog.getAttribute('aria-describedby')).toBe(el.id)
  expect(el.classList.contains('sr-only')).toBe(srOnly)
}

describe('dialog description (#13)', () => {
  const cases: [string, (extra?: object) => React.ReactElement][] = [
    [
      'create',
      extra => (
        <CreateDialog<Item>
          open
          onOpenChange={vi.fn()}
          createAction={vi.fn()}
          sections={sections}
          title='T'
          description='Descricao'
          {...extra}
        />
      ),
    ],
    [
      'edit',
      extra => (
        <EditDialog<Item>
          id='1'
          open
          onOpenChange={vi.fn()}
          fetchAction={fetchAction}
          updateAction={vi.fn()}
          sections={sections}
          title='T'
          description='Descricao'
          headerData={{ id: '1', name: 'Ana' }}
          {...extra}
        />
      ),
    ],
    [
      'view',
      extra => (
        <ViewDialog<Item>
          id='1'
          open
          onOpenChange={vi.fn()}
          fetchAction={fetchAction}
          title='T'
          description='Descricao'
          renderContent={() => <div>c</div>}
          {...extra}
        />
      ),
    ],
  ]

  it.each(cases)('%s: visible and linked by aria-describedby', async (_n, make) => {
    render(make())
    await screen.findByText('Descricao')
    expectDescribed('Descricao', false)
  })

  it.each(cases)('%s: sr-only with headerConfig', async (_n, make) => {
    render(make({ headerConfig }))
    await screen.findByText('Descricao')
    expectDescribed('Descricao', true)
  })

  it.each(cases)('%s: no description, no aria-describedby', async (_n, make) => {
    render(make({ description: undefined }))
    await screen.findByRole('dialog')
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby')
  })
})
