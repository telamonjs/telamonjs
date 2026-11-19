'use client'

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'
import '../test/ui-mocks'
import { ContentPortal } from './content-portal'
import { AdminPortal } from './shell/AdminPortal'
import type { PortalItem } from './content-portal'
import { msg } from '../i18n/msg'
import { withAppMessages } from '../test/intl'

expect.extend(axeMatchers as unknown as Parameters<typeof expect.extend>[0])
declare module 'vitest' {
  interface Assertion extends AxeMatchers {}
}

const makeItem = (overrides: Partial<PortalItem> = {}): PortalItem => ({
  value: 'dados',
  label: 'Dados',
  icon: 'User',
  content: <div>Conteúdo de Dados</div>,
  ...overrides,
})

describe('ContentPortal', () => {
  describe('Rendering', () => {
    it('renders the initial grid stage with a card per section', () => {
      const tabs = [
        makeItem(),
        makeItem({ value: 'contato', label: 'Contato', icon: 'Mail' }),
      ]
      render(<ContentPortal tabs={tabs} />)

      expect(
        screen.getByTestId('content-portal-item-dados')
      ).toBeInTheDocument()
      expect(
        screen.getByTestId('content-portal-item-contato')
      ).toBeInTheDocument()
      expect(screen.getByText('Dados')).toBeInTheDocument()
      expect(screen.getByText('Contato')).toBeInTheDocument()
      // Section content is not mounted yet (grid stage)
      expect(screen.queryByText('Conteúdo de Dados')).not.toBeInTheDocument()
    })

    it('pads the active panel by default and goes full-bleed with padded: false (7.8.0)', () => {
      const tabs = [
        makeItem(),
        makeItem({
          value: 'lista',
          label: 'Lista',
          icon: 'List',
          padded: false,
        }),
      ]
      const { rerender } = render(<ContentPortal tabs={tabs} value='dados' />)
      expect(screen.getByTestId('content-portal-panel-dados')).toHaveClass(
        'p-4'
      )

      rerender(<ContentPortal tabs={tabs} value='lista' />)
      expect(screen.getByTestId('content-portal-panel-lista')).not.toHaveClass(
        'p-4'
      )
    })

    it('renders a badge on the grid card when provided', () => {
      const tabs = [makeItem({ badge: 3 })]
      render(<ContentPortal tabs={tabs} />)
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('renders a description on the grid card when provided', () => {
      const tabs = [makeItem({ description: 'Dados pessoais e contato' })]
      render(<ContentPortal tabs={tabs} />)
      expect(screen.getByText('Dados pessoais e contato')).toBeInTheDocument()
    })

    it('resolves a MessageRef description (I18nText since 7.3)', () => {
      const tabs = [makeItem({ description: msg('portal.desc') })]
      render(<ContentPortal tabs={tabs} />, {
        wrapper: withAppMessages({ portal: { desc: 'Personal data' } }),
      })
      expect(screen.getByText('Personal data')).toBeInTheDocument()
    })

    it('opens directly into the section when defaultValue is set (skips the grid)', () => {
      const tabs = [
        makeItem(),
        makeItem({ value: 'contato', label: 'Contato', icon: 'Mail' }),
      ]
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)

      expect(screen.getByText('Conteúdo de Dados')).toBeInTheDocument()
      expect(
        screen.getByTestId('content-portal-panel-dados')
      ).toBeInTheDocument()
    })

    it('resolves a string icon via the icon registry (default color when none given)', () => {
      const tabs = [makeItem({ icon: 'User', color: undefined })]
      render(<ContentPortal tabs={tabs} />)
      expect(screen.getByTestId('icon-user')).toBeInTheDocument()
    })

    it('stage 2: nav and panel wrapper scroll independently (no dead sticky)', () => {
      const tabs = [makeItem()]
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)

      const nav = screen.getByRole('navigation', { name: 'Seções' })
      expect(nav).toHaveClass('p-1')
      expect(nav).toHaveClass('md:overflow-y-auto', 'md:py-4')
      expect(nav).not.toHaveClass('md:overflow-visible')

      const panelWrapper = screen.getByTestId(
        'content-portal-panel-dados'
      ).parentElement
      expect(panelWrapper).toHaveClass('md:overflow-y-auto')
      // no padding of its own: the content provides breathing room (full-bleed possible)
      expect(panelWrapper).not.toHaveClass('md:py-4')
    })
  })

  describe('Interactions', () => {
    it('clicking a grid card opens its section', async () => {
      const user = userEvent.setup()
      const tabs = [makeItem()]
      render(<ContentPortal tabs={tabs} />)

      await user.click(screen.getByTestId('content-portal-item-dados'))

      expect(screen.getByText('Conteúdo de Dados')).toBeInTheDocument()
      expect(
        screen.getByTestId('content-portal-panel-dados')
      ).toBeInTheDocument()
    })

    it('rail switches the active panel, hiding the previous one (not unmounting it)', async () => {
      const user = userEvent.setup()
      const tabs = [
        makeItem(),
        makeItem({
          value: 'contato',
          label: 'Contato',
          icon: 'Mail',
          content: <div>Conteúdo de Contato</div>,
        }),
      ]
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)

      await user.click(screen.getByTestId('content-portal-item-contato'))

      expect(screen.getByText('Conteúdo de Contato')).toBeInTheDocument()
      // 'Dados' panel is kept mounted (keep-alive) but hidden
      expect(screen.getByTestId('content-portal-panel-dados')).toHaveClass(
        'hidden'
      )
      expect(
        screen.getByTestId('content-portal-panel-contato')
      ).not.toHaveClass('hidden')
    })

    it('keepAlive={false}: rail switches the active panel, UNMOUNTING the previous one', async () => {
      const user = userEvent.setup()
      const tabs = [
        makeItem(),
        makeItem({
          value: 'contato',
          label: 'Contato',
          icon: 'Mail',
          content: <div>Conteúdo de Contato</div>,
        }),
      ]
      render(
        <ContentPortal tabs={tabs} defaultValue='dados' keepAlive={false} />
      )

      expect(
        screen.getByTestId('content-portal-panel-dados')
      ).toBeInTheDocument()

      await user.click(screen.getByTestId('content-portal-item-contato'))

      expect(screen.getByText('Conteúdo de Contato')).toBeInTheDocument()
      // Unlike the default keep-alive behavior, the inactive panel is gone
      // from the DOM entirely, not just hidden — avoids stacking dialogs
      // that a panel's own content (e.g. an embedded ListPage) opens by URL.
      expect(
        screen.queryByTestId('content-portal-panel-dados')
      ).not.toBeInTheDocument()
    })

    it('"Todas as seções" returns to the grid stage', async () => {
      const user = userEvent.setup()
      const tabs = [makeItem()]
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)

      await user.click(screen.getByTestId('content-portal-item-all'))

      expect(
        screen.getByTestId('content-portal-item-dados')
      ).toBeInTheDocument()
      expect(screen.queryByText('Conteúdo de Dados')).not.toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('controlled mode: value drives the active section, including null for the grid', () => {
      const tabs = [makeItem()]
      const { rerender } = render(<ContentPortal tabs={tabs} value={null} />)
      expect(
        screen.getByTestId('content-portal-item-dados')
      ).toBeInTheDocument()
      expect(screen.queryByText('Conteúdo de Dados')).not.toBeInTheDocument()

      rerender(<ContentPortal tabs={tabs} value='dados' />)
      expect(screen.getByText('Conteúdo de Dados')).toBeInTheDocument()
    })

    it('controlled mode: clicking calls onValueChange but does not move without a value update', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      const tabs = [makeItem()]
      render(
        <ContentPortal tabs={tabs} value={null} onValueChange={onValueChange} />
      )

      await user.click(screen.getByTestId('content-portal-item-dados'))

      expect(onValueChange).toHaveBeenCalledWith('dados')
      // still on the grid: the parent hasn't fed the new value back yet
      expect(screen.queryByText('Conteúdo de Dados')).not.toBeInTheDocument()
    })

    it('lazy mount: a section panel is not mounted until first visited', () => {
      const tabs = [
        makeItem(),
        makeItem({
          value: 'contato',
          label: 'Contato',
          icon: 'Mail',
          content: <div>Conteúdo de Contato</div>,
        }),
      ]
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)

      expect(
        screen.queryByTestId('content-portal-panel-contato')
      ).not.toBeInTheDocument()
    })

    it('keep-alive: a visited section stays mounted after navigating back to the grid and re-entering another', async () => {
      const user = userEvent.setup()
      const tabs = [
        makeItem(),
        makeItem({
          value: 'contato',
          label: 'Contato',
          icon: 'Mail',
          content: <div>Conteúdo de Contato</div>,
        }),
      ]
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)

      await user.click(screen.getByTestId('content-portal-item-contato'))
      await user.click(screen.getByTestId('content-portal-item-all'))
      await user.click(screen.getByTestId('content-portal-item-dados'))

      // 'contato' was visited earlier and must still be mounted (hidden)
      expect(screen.getByTestId('content-portal-panel-contato')).toHaveClass(
        'hidden'
      )
    })
  })

  describe('Grouping (PortalItem.group)', () => {
    it('retrocompat: no item has `group` → grid renders as a single unlabeled grid', () => {
      const tabs = [
        makeItem(),
        makeItem({ value: 'contato', label: 'Contato', icon: 'Mail' }),
      ]
      render(<ContentPortal tabs={tabs} />)

      expect(
        screen.getByTestId('content-portal-item-dados')
      ).toBeInTheDocument()
      expect(
        screen.getByTestId('content-portal-item-contato')
      ).toBeInTheDocument()
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('retrocompat: no item has `group` → rail renders with no group labels', () => {
      const tabs = [
        makeItem(),
        makeItem({ value: 'contato', label: 'Contato', icon: 'Mail' }),
      ]
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)

      const nav = screen.getByRole('navigation', { name: 'Seções' })
      // Only the rail items + "Todas as seções" button — no extra label nodes.
      expect(nav.children).toHaveLength(3)
    })

    it('grid: renders a heading per group, in item order, clustering consecutive same-group items', () => {
      const tabs = [
        makeItem({ value: 'geral', label: 'Geral', group: 'O processo' }),
        makeItem({ value: 'prazos', label: 'Prazos', group: 'O processo' }),
        makeItem({ value: 'vagas', label: 'Vagas', group: 'Estrutura' }),
      ]
      render(<ContentPortal tabs={tabs} />)

      const headings = screen.getAllByRole('heading').map(h => h.textContent)
      expect(headings).toEqual(['O processo', 'Estrutura'])
      // All cards still present, regardless of grouping.
      expect(
        screen.getByTestId('content-portal-item-geral')
      ).toBeInTheDocument()
      expect(
        screen.getByTestId('content-portal-item-prazos')
      ).toBeInTheDocument()
      expect(
        screen.getByTestId('content-portal-item-vagas')
      ).toBeInTheDocument()
    })

    it('rail: shows group labels before the first item of each group, in item order', () => {
      const tabs = [
        makeItem({ value: 'geral', label: 'Geral', group: 'O processo' }),
        makeItem({ value: 'prazos', label: 'Prazos', group: 'O processo' }),
        makeItem({ value: 'vagas', label: 'Vagas', group: 'Estrutura' }),
      ]
      render(<ContentPortal tabs={tabs} defaultValue='geral' />)

      const nav = screen.getByRole('navigation', { name: 'Seções' })
      const labels = ['O processo', 'Estrutura', 'Geral', 'Prazos', 'Vagas']
      const positions = labels.map(text =>
        Array.from(nav.querySelectorAll('*')).findIndex(
          el => el.textContent === text && el.children.length === 0
        )
      )
      // Group label ordering matches item order, and each label precedes its items.
      expect(positions[0]).toBeGreaterThanOrEqual(0) // 'O processo'
      expect(positions[2]).toBeGreaterThan(positions[0]) // 'Geral' after its label
      expect(positions[3]).toBeGreaterThan(positions[2]) // 'Prazos' after 'Geral'
      expect(positions[1]).toBeGreaterThan(positions[3]) // 'Estrutura' after the first block
      expect(positions[4]).toBeGreaterThan(positions[1]) // 'Vagas' after its label
    })

    it('items without `group` render before any group, with no label', () => {
      const tabs = [
        makeItem({ value: 'solto', label: 'Solto' }),
        makeItem({ value: 'geral', label: 'Geral', group: 'O processo' }),
      ]
      render(<ContentPortal tabs={tabs} defaultValue='solto' />)

      expect(
        screen.getByTestId('content-portal-item-solto')
      ).toBeInTheDocument()
      expect(screen.getByText('O processo')).toBeInTheDocument()
      expect(screen.queryAllByRole('heading')).toEqual([]) // rail label isn't a heading
    })
  })

  describe('columns (grid max width)', () => {
    it('defaults to the pre-`columns` grid classes (lg:grid-cols-4) when omitted', () => {
      const tabs = [makeItem()]
      render(<ContentPortal tabs={tabs} />)
      const grid = screen.getByTestId('content-portal-item-dados').parentElement
      expect(grid).toHaveClass(
        'grid-cols-2',
        'sm:grid-cols-3',
        'lg:grid-cols-4'
      )
    })

    it.each([
      [3, ['grid-cols-2', 'sm:grid-cols-3']],
      [4, ['grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4']],
      [
        5,
        ['grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5'],
      ],
      [
        6,
        ['grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-6'],
      ],
    ] as const)('columns=%i applies %j', (columns, expectedClasses) => {
      const tabs = [makeItem()]
      render(<ContentPortal tabs={tabs} columns={columns} />)
      const grid = screen.getByTestId('content-portal-item-dados').parentElement
      expectedClasses.forEach(c => expect(grid).toHaveClass(c))
    })

    it('falls back to the default for an unsupported value', () => {
      const tabs = [makeItem()]
      render(<ContentPortal tabs={tabs} columns={99} />)
      const grid = screen.getByTestId('content-portal-item-dados').parentElement
      expect(grid).toHaveClass('lg:grid-cols-4')
    })

    it('applies to the grouped-grid path too', () => {
      const tabs = [
        makeItem({ value: 'geral', label: 'Geral', group: 'O processo' }),
      ]
      render(<ContentPortal tabs={tabs} columns={6} />)
      const grid = screen.getByTestId('content-portal-item-geral').parentElement
      expect(grid).toHaveClass('xl:grid-cols-6')
    })
  })

  describe('Edge Cases', () => {
    it('renders an empty grid without crashing when tabs is []', () => {
      render(<ContentPortal tabs={[]} />)
      expect(screen.queryByTestId(/^content-portal-item-/)).toBeNull()
    })

    it('renders a single-card grid', () => {
      render(<ContentPortal tabs={[makeItem()]} />)
      expect(
        screen.getByTestId('content-portal-item-dados')
      ).toBeInTheDocument()
    })

    it('renders 12 sections in the grid and their rail items when in a section', () => {
      const tabs = Array.from({ length: 12 }, (_, i) =>
        makeItem({ value: `s${i}`, label: `Seção ${i}` })
      )
      render(<ContentPortal tabs={tabs} defaultValue='s0' />)

      tabs.forEach(t => {
        expect(
          screen.getByTestId(`content-portal-item-${t.value}`)
        ).toBeInTheDocument()
      })
    })

    it('falls back to the grid when defaultValue does not match any tab', () => {
      const tabs = [makeItem()]
      render(<ContentPortal tabs={tabs} defaultValue='nao-existe' />)

      // No matching panel content is rendered
      expect(screen.queryByText('Conteúdo de Dados')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('marks the active rail item with aria-current', async () => {
      const user = userEvent.setup()
      const tabs = [
        makeItem(),
        makeItem({ value: 'contato', label: 'Contato', icon: 'Mail' }),
      ]
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)

      expect(screen.getByTestId('content-portal-item-dados')).toHaveAttribute(
        'aria-current',
        'page'
      )
      expect(
        screen.getByTestId('content-portal-item-contato')
      ).not.toHaveAttribute('aria-current')

      await user.click(screen.getByTestId('content-portal-item-contato'))
      expect(screen.getByTestId('content-portal-item-contato')).toHaveAttribute(
        'aria-current',
        'page'
      )
    })

    it('rail items are native buttons and keyboard-operable', async () => {
      const user = userEvent.setup()
      const tabs = [makeItem()]
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)

      const allSectionsBtn = screen.getByTestId('content-portal-item-all')
      allSectionsBtn.focus()
      expect(allSectionsBtn).toHaveFocus()
      await user.keyboard('{Enter}')

      expect(
        screen.getByTestId('content-portal-item-dados')
      ).toBeInTheDocument()
    })

    it('axe smoke: grid stage has no violations', async () => {
      const tabs = [
        makeItem(),
        makeItem({ value: 'contato', label: 'Contato' }),
      ]
      const { container } = render(<ContentPortal tabs={tabs} />)

      expect(
        await axe(container, {
          rules: {
            'color-contrast': { enabled: false },
            region: { enabled: false },
          },
        })
      ).toHaveNoViolations()
    })

    it('axe smoke: section stage has no violations', async () => {
      const tabs = [
        makeItem(),
        makeItem({ value: 'contato', label: 'Contato' }),
      ]
      const { container } = render(
        <ContentPortal tabs={tabs} defaultValue='dados' />
      )

      expect(
        await axe(container, {
          rules: {
            'color-contrast': { enabled: false },
            region: { enabled: false },
          },
        })
      ).toHaveNoViolations()
    })
  })

  describe('Mobile', () => {
    const tabs = [
      makeItem(),
      makeItem({ value: 'contato', label: 'Contato', icon: 'Mail' }),
    ]

    it('keeps the active panel a plain block by default', () => {
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)
      const panel = screen.getByTestId('content-portal-panel-dados')
      expect(panel.className).toContain('block md:h-full')
    })

    it('mobileFill makes the active panel a bounded flex column below md', () => {
      render(<ContentPortal tabs={tabs} defaultValue='dados' mobileFill />)
      const panel = screen.getByTestId('content-portal-panel-dados')
      expect(panel).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col')
      expect(panel).toHaveClass('md:block', 'md:h-full')
      expect(panel.parentElement).toHaveClass(
        'flex',
        'min-h-0',
        'flex-col',
        'max-md:overflow-hidden',
        'md:overflow-y-auto'
      )
      // md+ unchanged: no unprefixed overflow clipping
      expect(panel.parentElement).not.toHaveClass('overflow-hidden')
    })

    it.each([
      ['flat', [makeItem()]],
      ['grouped', [makeItem({ group: 'G' })]],
    ] as const)(
      'AdminPortal %s grid launcher scrolls inside its own background',
      (_, items) => {
        // fillHeight caps the wrapper (flex-1 min-h-0); without its own
        // scroller the last card row overflowed past bg-muted on mobile.
        render(<AdminPortal tabs={[...items]} />)
        const wrapper = screen
          .getByTestId('content-portal-item-dados')
          .closest('.bg-muted\\/50')
        expect(wrapper).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto')
      }
    )

    it('AdminPortal forwards mobileFill', () => {
      render(<AdminPortal tabs={tabs} defaultValue='dados' mobileFill />)
      expect(screen.getByTestId('content-portal-panel-dados')).toHaveClass(
        'flex-1',
        'min-h-0'
      )
    })

    it('rail pills are full-width only from md (mobile strip)', () => {
      render(<ContentPortal tabs={tabs} defaultValue='dados' />)
      const pill = screen.getByTestId('content-portal-item-contato')
      expect(pill).toHaveClass('md:w-full')
      expect(pill).not.toHaveClass('w-full')
    })

    it('scrolls only the strip (not the window) to the active pill', async () => {
      const winScroll = vi
        .spyOn(window, 'scrollTo')
        .mockImplementation(() => {})
      const proto = HTMLElement.prototype
      const sw = vi.spyOn(proto, 'scrollWidth', 'get').mockReturnValue(800)
      const cw = vi.spyOn(proto, 'clientWidth', 'get').mockReturnValue(390)
      const ow = vi.spyOn(proto, 'offsetWidth', 'get').mockReturnValue(100)
      const navScroll = vi.fn()
      const originalScrollTo = proto.scrollTo
      proto.scrollTo = navScroll as never
      // pill "contato" sits off-screen at x=500 inside the strip
      const rect = vi
        .spyOn(proto, 'getBoundingClientRect')
        .mockImplementation(function (this: HTMLElement) {
          const left =
            this.dataset.testid === 'content-portal-item-contato' ? 500 : 0
          return { left } as DOMRect
        })
      try {
        render(<ContentPortal tabs={tabs} defaultValue='dados' />)
        expect(navScroll).not.toHaveBeenCalled() // "dados" already visible
        await userEvent.click(screen.getByTestId('content-portal-item-contato'))
        expect(navScroll).toHaveBeenCalledTimes(1)
        expect(navScroll.mock.contexts[0]).toBe(screen.getByRole('navigation'))
        expect(navScroll).toHaveBeenCalledWith({ left: 492 })
        expect(winScroll).not.toHaveBeenCalled()
      } finally {
        proto.scrollTo = originalScrollTo
        ;[winScroll, sw, cw, ow, rect].forEach(s => s.mockRestore())
      }
    })
  })

  describe('fill (7.10)', () => {
    it('adds md:flex-1 md:min-h-0 to the root only when fill is set', () => {
      const tabs = [makeItem()]
      const { rerender } = render(
        <ContentPortal tabs={tabs} defaultValue='dados' />
      )
      const root = () =>
        screen.getByTestId('content-portal-item-all').closest('nav')!
          .parentElement!
      expect(root().className).not.toContain('md:flex-1')
      rerender(<ContentPortal tabs={tabs} defaultValue='dados' fill />)
      expect(root().className).toContain('md:flex-1')
      expect(root().className).toContain('md:min-h-0')
    })
  })

})
