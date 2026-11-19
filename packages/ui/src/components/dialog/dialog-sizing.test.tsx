/**
 * 7.10 dialog sizing: dialogClassName is additive (and reaches the mobile
 * Sheet minus width/height utilities), `dialogHeight`, and the flex/min-h-0
 * chain for headerConfig + a single section.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CreateDialog } from './create-dialog'
import { EditDialog } from './edit-dialog'
import { ViewDialog } from './view-dialog'
import { getDialogClassName, getSheetClassName } from '../../utils/spacing'
import type { DialogHeaderConfig } from '../../types/dialog-header'

let mockIsMobile = false
vi.mock('../../hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/x',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('../../field-system/field-registry', () => ({
  getFieldRenderer: vi.fn(() => ({ render: () => <input /> })),
  FieldType: {} as Record<string, never>,
}))
vi.mock('../forms/validators/config-validator', () => ({
  logValidationResult: vi.fn(),
  validateFormSections: vi.fn(() => true),
}))
vi.mock('../../hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

// Expose className (the global mock drops it)
vi.mock('../../ui/dialog', () => {
  const pass =
    (tid: string) =>
    ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <div data-testid={tid} className={className}>
        {children}
      </div>
    )
  return {
    Dialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    DialogContent: pass('dialog-content'),
    DialogHeader: pass('dialog-header'),
    DialogTitle: pass('dialog-title'),
    DialogDescription: pass('dialog-description'),
  }
})
vi.mock('../../ui/sheet', () => {
  const pass =
    (tid: string) =>
    ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <div data-testid={tid} className={className}>
        {children}
      </div>
    )
  return {
    Sheet: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    SheetContent: pass('sheet-content'),
    SheetHeader: pass('sheet-header'),
    SheetTitle: pass('sheet-title'),
    SheetDescription: pass('sheet-description'),
  }
})

interface E extends Record<string, unknown> {
  id: string
  name: string
}
const sections = [
  { label: 'Dados', fields: [{ name: 'name', label: 'Nome', type: 'text' as const }] },
]
const headerConfig: DialogHeaderConfig<E> = {
  icon: 'Settings',
  iconColor: 'purple',
  title: 'T',
}

beforeEach(() => {
  mockIsMobile = false
})

describe('getDialogClassName (7.10)', () => {
  it('dialogClassName is merged over the size preset instead of replacing it', () => {
    const { sizeClass } = getDialogClassName({
      size: 'sm',
      dialogClassName: 'max-w-6xl [&_x]:flex-wrap',
      hasCustomHeader: false,
    })
    expect(sizeClass).toContain('w-[90vw]')
    expect(sizeClass).toContain('max-w-6xl')
    expect(sizeClass).not.toContain('max-w-md') // app class wins the conflict
    expect(sizeClass).toContain('[&_x]:flex-wrap')
  })

  it("height 'full' yields h-[min(800px,85vh)] without a custom header", () => {
    const { finalClassName } = getDialogClassName({
      height: 'full',
      hasCustomHeader: false,
    })
    expect(finalClassName).toContain('h-[min(800px,85vh)]')
    expect(finalClassName).not.toContain('max-h-[90vh]')
  })

  it("height 'auto' (default) keeps the legacy max-h", () => {
    const { finalClassName } = getDialogClassName({ hasCustomHeader: true })
    expect(finalClassName).toContain('max-h-[90vh]')
  })

  it('an app h-* class overrides the computed height', () => {
    const { finalClassName } = getDialogClassName({
      height: 'full',
      dialogClassName: 'h-[90vh]',
      hasCustomHeader: false,
    })
    expect(finalClassName).toContain('h-[90vh]')
    expect(finalClassName).not.toContain('h-[min(800px,85vh)]')
  })
})

describe('getSheetClassName (7.10)', () => {
  it('drops width/height utilities and keeps everything else', () => {
    expect(
      getSheetClassName(
        'w-[80vw] max-w-7xl h-[90vh] min-h-0 md:max-w-3xl rounded-none [&_[role=tablist]]:flex-wrap md:[&_div:has(>nav)]:flex-1'
      )
    ).toBe('rounded-none [&_[role=tablist]]:flex-wrap md:[&_div:has(>nav)]:flex-1')
  })
  it('handles undefined', () => {
    expect(getSheetClassName(undefined)).toBe('')
  })
})

describe('Create/Edit/View dialogs (7.10)', () => {
  it('CreateDialog desktop: size preset + app class coexist; dialogHeight full applies', () => {
    render(
      <CreateDialog<E>
        open
        onOpenChange={vi.fn()}
        createAction={vi.fn()}
        sections={sections}
        title='Novo'
        size='sm'
        dialogClassName='max-w-6xl'
        dialogHeight='full'
      />
    )
    const c = screen.getByTestId('dialog-content').className
    expect(c).toContain('w-[90vw]')
    expect(c).toContain('max-w-6xl')
    expect(c).toContain('h-[min(800px,85vh)]')
  })

  it('CreateDialog mobile: Sheet receives the app class minus widths', () => {
    mockIsMobile = true
    render(
      <CreateDialog<E>
        open
        onOpenChange={vi.fn()}
        createAction={vi.fn()}
        sections={sections}
        title='Novo'
        dialogClassName='w-[80vw] max-w-7xl rounded-none'
      />
    )
    const c = screen.getByTestId('sheet-content').className
    expect(c).toContain('rounded-none')
    expect(c).not.toContain('max-w-7xl')
    expect(c).not.toContain('w-[80vw]')
  })

  it('EditDialog mobile: Sheet receives the app class minus widths', async () => {
    mockIsMobile = true
    render(
      <EditDialog<E>
        id='1'
        open
        onOpenChange={vi.fn()}
        fetchAction={vi.fn().mockResolvedValue({ id: '1', name: 'A' })}
        updateAction={vi.fn()}
        sections={sections}
        title='Editar'
        dialogClassName='max-w-7xl rounded-none'
      />
    )
    const c = (await screen.findByTestId('sheet-content')).className
    expect(c).toContain('rounded-none')
    expect(c).not.toContain('max-w-7xl')
  })

  it('ViewDialog desktop: dialogHeight full applies and the size preset survives', async () => {
    render(
      <ViewDialog<E>
        id='1'
        open
        onOpenChange={vi.fn()}
        fetchAction={vi.fn().mockResolvedValue({ id: '1', name: 'A' })}
        renderContent={() => <div>conteudo</div>}
        title='Ver'
        size='md'
        dialogClassName='rounded-none'
        dialogHeight='full'
      />
    )
    await screen.findByText('conteudo')
    const c = screen.getByTestId('dialog-content').className
    expect(c).toContain('h-[min(800px,85vh)]')
    expect(c).toContain('max-w-2xl')
    expect(c).toContain('rounded-none')
  })

  it('CreateDialog headerConfig + single section: min-h-0 chain so the flush form can scroll', () => {
    render(
      <CreateDialog<E>
        open
        onOpenChange={vi.fn()}
        createAction={vi.fn()}
        sections={sections}
        title='Novo'
        headerConfig={headerConfig}
      />
    )
    const content = screen.getByTestId('dialog-content')
    expect(content.className).toContain('max-h-[90vh]')
    const form = content.querySelector('form')!
    const formRoot = form.parentElement!
    expect(formRoot.className).toContain('min-h-0')
    expect(formRoot.parentElement!.className).toMatch(/min-h-0/)
    expect(formRoot.parentElement!.className).toContain('flex-col')
  })

  it('EditDialog headerConfig + single section: body is a flex column with min-h-0', async () => {
    render(
      <EditDialog<E>
        id='1'
        open
        onOpenChange={vi.fn()}
        fetchAction={vi.fn().mockResolvedValue({ id: '1', name: 'A' })}
        updateAction={vi.fn()}
        sections={sections}
        title='Editar'
        headerConfig={headerConfig}
      />
    )
    const form = await screen.findByRole('textbox').then(el => el.closest('form')!)
    const formRoot = form.parentElement!
    expect(formRoot.className).toContain('min-h-0')
    expect(formRoot.parentElement!.className).toContain('flex-col')
    expect(formRoot.parentElement!.className).toContain('min-h-0')
  })
})

describe('Dialog tab strip (7.10)', () => {
  it('wraps onto extra rows at md+ instead of cutting the last tab', () => {
    render(
      <CreateDialog<E>
        open
        onOpenChange={vi.fn()}
        createAction={vi.fn()}
        sections={[
          ...sections,
          { label: 'Outra', fields: [{ name: 'x', label: 'X', type: 'text' as const }] },
        ]}
        title='Novo'
        useTabs
      />
    )
    expect(screen.getByRole('tablist').className).toContain('md:flex-wrap')
  })
})
