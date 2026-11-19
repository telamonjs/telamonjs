import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { Breadcrumb } from './Breadcrumb'
import { telamonjsMessages } from '../i18n/messages'
import { msg } from '../i18n/msg'
import type { MenuItem } from '../types/menu'

const resetToHome = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

// `usePathname` is read at render time — tests set this before rendering.
let currentPathname = '/admin/users'
function mockPathname() {
  return currentPathname
}

vi.mock('../stores/menu-store', () => ({
  useMenuActions: () => ({ resetToHome }),
}))

describe('Breadcrumb', () => {
  beforeEach(() => {
    currentPathname = '/admin/users'
    resetToHome.mockClear()
  })

  describe('Rendering', () => {
    it('renders the Home segment', () => {
      render(<Breadcrumb />)

      expect(screen.getByText('Início')).toBeInTheDocument()
    })

    it('renders a segment for each URL path segment', () => {
      currentPathname = '/admin/users'
      render(<Breadcrumb />)

      expect(screen.getByText('Início')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
    })

    it('renders every segment visible on first render (no delayed fade)', () => {
      currentPathname = '/admin/users'
      render(<Breadcrumb />)

      for (const label of ['Início', 'Users']) {
        let el: HTMLElement | null = screen.getByText(label)
        while (el) {
          expect(el.style.opacity).not.toBe('0')
          el = el.parentElement
        }
      }
    })

    it('renders a separator between segments', () => {
      currentPathname = '/admin/users'
      const { container } = render(<Breadcrumb />)

      // ChevronRight renders as an svg; one separator between Home and Users.
      expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
    })
  })

  describe('Link vs current item', () => {
    it('renders non-last segments as links', () => {
      currentPathname = '/admin/users'
      render(<Breadcrumb />)

      const homeLink = screen.getByText('Início').closest('a')
      expect(homeLink).toHaveAttribute('href', '/admin')
    })

    it('renders the last segment as the current item, not a link', () => {
      currentPathname = '/admin/users'
      render(<Breadcrumb />)

      const currentSegment = screen.getByText('Users')
      expect(currentSegment.closest('a')).not.toBeInTheDocument()
    })

    it('calls resetToHome when the Home link is clicked', async () => {
      const { default: userEvent } = await import('@testing-library/user-event')
      currentPathname = '/admin/users'
      render(<Breadcrumb />)

      const homeLink = screen.getByText('Início').closest('a')
      expect(homeLink).not.toBeNull()
      await userEvent.click(homeLink!)

      expect(resetToHome).toHaveBeenCalledTimes(1)
    })
  })

  describe('msg() label resolution', () => {
    it('resolves a menu item title provided as msg() against app-level messages', () => {
      currentPathname = '/admin/reports'
      const menuConfig: MenuItem[] = [
        {
          id: 'reports',
          type: 'single',
          href: '/admin/reports',
          title: msg('app.customTitle'),
        },
      ]

      render(
        <NextIntlClientProvider
          locale='pt-BR'
          timeZone='America/Sao_Paulo'
          messages={{
            ...telamonjsMessages['pt-BR'],
            app: { customTitle: 'Título Customizado' },
          }}
        >
          <Breadcrumb menuConfig={menuConfig} />
        </NextIntlClientProvider>
      )

      expect(screen.getByText('Título Customizado')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('sets an aria-label on the nav landmark', () => {
      currentPathname = '/admin/users'
      render(<Breadcrumb />)

      expect(screen.getByRole('navigation')).toHaveAttribute(
        'aria-label',
        'Trilha de navegação'
      )
    })
  })
})

describe('Breadcrumb segments (consumer QA 7.3.1)', () => {
  const menu: MenuItem[] = [
    {
      id: 'config',
      type: 'group',
      title: 'Configurações',
      children: [{ id: 'gw', type: 'single', title: 'Gateway', href: '/admin/configuracoes/gateway' }],
    },
  ]

  it('separator after Início even when no segment matches the menu', () => {
    currentPathname = '/admin/ferramentas/relatorios'
    const { container } = render(<Breadcrumb menuConfig={menu} />)
    const nav = container.querySelector('nav')!
    // 'Início' › 'Ferramentas' › 'Relatorios' (2 separators, in URL order)
    expect(nav.textContent).toMatch(/Início.*Ferramentas.*Relatorios/)
    expect(nav.querySelectorAll('svg[data-icon="ChevronRight"]').length).toBe(2)
  })

  it('does not link a segment that is not a route', () => {
    currentPathname = '/admin/ferramentas/relatorios'
    render(<Breadcrumb menuConfig={menu} />)
    expect(screen.getByText('Ferramentas').closest('a')).toBeNull()
  })

  it('uses the menu group title for its path and keeps URL order', () => {
    currentPathname = '/admin/configuracoes/gateway'
    const { container } = render(<Breadcrumb menuConfig={menu} />)
    expect(container.querySelector('nav')!.textContent).toMatch(/Início.*Configurações.*Gateway/)
    expect(screen.queryByText('Configuracoes')).not.toBeInTheDocument()
  })

  it('customSegments by full path or segment; slug fallback without "_"', () => {
    currentPathname = '/admin/gateway_selecionar-ids/x'
    render(<Breadcrumb customSegments={{ '/admin/gateway_selecionar-ids/x': 'Seleção' }} />)
    expect(screen.getByText('Gateway selecionar ids')).toBeInTheDocument()
    expect(screen.getByText('Seleção')).toBeInTheDocument()
  })

  it('customSegments { label, href } links an off-menu segment to href', () => {
    currentPathname = '/admin/clientes/123'
    render(
      <Breadcrumb
        customSegments={{ '/admin/clientes': { label: 'Clientes', href: '/admin/cadastro?tab=clientes' } }}
      />
    )
    expect(screen.getByText('Clientes').closest('a')).toHaveAttribute('href', '/admin/cadastro?tab=clientes')
  })

  it('entityName labels the record id segment; English action segments are recognized', () => {
    currentPathname = '/admin/clientes/123/edit'
    render(<Breadcrumb entityName='Acme Corp' />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.queryByText(/123/)).not.toBeInTheDocument()
    expect(screen.queryByText('Edit')).not.toBeInTheDocument() // localized label, not the raw slug
  })

  it('customSegments plain string still overrides the label without a link', () => {
    currentPathname = '/admin/clientes/123'
    render(<Breadcrumb customSegments={{ clientes: 'Clientes' }} />)
    expect(screen.getByText('Clientes').closest('a')).toBeNull()
  })

  it('customSegments object without href only overrides the label', () => {
    currentPathname = '/admin/clientes/123'
    render(<Breadcrumb customSegments={{ clientes: { label: 'Clientes' } }} />)
    expect(screen.getByText('Clientes').closest('a')).toBeNull()
  })

  it('href on the last segment never becomes a link', () => {
    currentPathname = '/admin/clientes'
    render(<Breadcrumb customSegments={{ clientes: { label: 'Clientes', href: '/admin/cadastro' } }} />)
    expect(screen.getByText('Clientes').closest('a')).toBeNull()
  })

  it("custom href '/admin' on a deep last segment is still not a link", () => {
    currentPathname = '/admin/clientes/123'
    render(<Breadcrumb customSegments={{ '/admin/clientes/123': { label: 'Detalhe', href: '/admin' } }} />)
    expect(screen.getByText('Detalhe').closest('a')).toBeNull()
  })

  it('collapsed dropdown links a custom href segment', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    currentPathname = '/admin/a/b/c/d'
    render(<Breadcrumb maxItems={3} customSegments={{ a: { label: 'Aaa', href: '/admin/x' } }} />)
    await userEvent.click(screen.getByRole('button', { name: /ocultos|hidden/i }))
    expect((await screen.findByText('Aaa')).closest('a')).toHaveAttribute('href', '/admin/x')
  })
})

// PRD 068 item 9: id-looking segments (cuid, uuid, ObjectId, ULID) read as
// an abbreviated "ID: …" instead of a raw capitalized slug; conservative
// patterns so slugs/job names never match; customSegments still wins.
describe('Breadcrumb id segments (PRD 068)', () => {
  const cases: [string, string][] = [
    ['cm8x2k9q00001abcd1234ab12', 'ID: cm8x…ab12'], // cuid
    ['3f2b8c1e-9a4d-4e2b-8f1a-1234567890ab', 'ID: 3f2b…90ab'], // uuid
    ['507f1f77bcf86cd799439011', 'ID: 507f…9011'], // ObjectId
    ['01ARZ3NDEKTSV4RRFFQ69G5FAV', 'ID: 01AR…5FAV'], // ULID
    ['42', 'ID: 42'], // number (short ids stay whole)
  ]
  for (const [segment, label] of cases) {
    it(`${segment} → ${label}`, () => {
      currentPathname = `/admin/alunos/${segment}`
      render(<Breadcrumb />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  }

  for (const slug of ['gateway_selecionar-ids', 'configuracoesgeraisdosist', 'relatorios']) {
    it(`slug ${slug} is not treated as an id`, () => {
      currentPathname = `/admin/ajuda/${slug}`
      const { container } = render(<Breadcrumb />)
      expect(container.querySelector('nav')!.textContent).not.toMatch(/ID:/)
    })
  }

  it('customSegments still overrides an id segment', () => {
    currentPathname = '/admin/alunos/cm8x2k9q00001abcd1234ab12'
    render(<Breadcrumb customSegments={{ cm8x2k9q00001abcd1234ab12: 'Ana Souza' }} />)
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.queryByText(/ID:/)).not.toBeInTheDocument()
  })
})
