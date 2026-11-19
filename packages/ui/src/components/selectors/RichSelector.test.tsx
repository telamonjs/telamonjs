import { describe, expect, it, vi } from 'vitest'
import { useState, type ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FormProvider, useForm } from 'react-hook-form'
import { RichSelector, type RichSelectorItem } from './RichSelector'
import { RichSelectorField } from './RichSelectorField'

// src/test/ui-mocks.tsx keeps the popover content always in the DOM.

const ITEMS: RichSelectorItem<number>[] = [
  { value: 1, label: 'Ação Rápida', description: '11.222.333/0001-81' },
  { value: 2, label: 'Beta Ltda', searchText: 'matriz' },
  { value: 3, label: 'Gama', disabled: true },
]

const withQuery = (ui: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const option = (name: RegExp) => screen.getByRole('option', { name })
const search = () => screen.getByRole('searchbox')

describe('RichSelector with items', () => {
  it('needs no QueryClient and shows the selected title and detail', () => {
    render(<RichSelector items={ITEMS} value={1} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox').textContent).toContain('Ação Rápida')
    expect(screen.getByRole('combobox').textContent).toContain('11.222.333')
  })

  it('search ignores accents and matches detail and searchText', async () => {
    const user = userEvent.setup()
    render(<RichSelector items={ITEMS} value={null} onChange={vi.fn()} />)
    await user.type(search(), 'acao')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await user.clear(search())
    await user.type(search(), 'matriz')
    expect(option(/Beta/)).toBeTruthy()
    await user.clear(search())
    await user.type(search(), '333')
    expect(option(/Ação/)).toBeTruthy()
  })

  it('picks a value with its item, and ignores a disabled option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RichSelector items={ITEMS} value={null} onChange={onChange} />)
    await user.click(option(/Gama/))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(option(/Beta/))
    expect(onChange).toHaveBeenCalledWith(2, ITEMS[1])
  })

  it('compares ids by text: number option, string value', () => {
    render(<RichSelector<number> items={ITEMS} value={'2' as never} onChange={vi.fn()} />)
    expect(option(/Beta/).getAttribute('aria-selected')).toBe('true')
  })

  it('clearing row: only with a selection, and never when required', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <RichSelector
        items={ITEMS}
        value={1}
        onChange={onChange}
        labels={{ none: 'Sem cliente' }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Sem cliente' }))
    expect(onChange).toHaveBeenCalledWith(null, null)

    rerender(
      <RichSelector
        items={ITEMS}
        value={null}
        onChange={onChange}
        labels={{ none: 'Sem cliente' }}
      />
    )
    expect(screen.queryByRole('button', { name: 'Sem cliente' })).toBeNull()

    rerender(
      <RichSelector
        items={ITEMS}
        value={1}
        required
        onChange={onChange}
        labels={{ none: 'Sem cliente' }}
      />
    )
    expect(screen.queryByRole('button', { name: 'Sem cliente' })).toBeNull()
  })

  it('keyboard: arrows skip disabled options, Enter picks without submitting the form', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <RichSelector items={ITEMS} value={null} onChange={onChange} />
      </form>
    )
    await user.click(search())
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    // Starts on 1 → 2 → (3 is disabled) → back to 1
    expect(onChange).toHaveBeenCalledWith(1, ITEMS[0])
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Enter with nothing highlighted picks the first enabled match', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <RichSelector
          items={[{ value: 9, label: 'Off', disabled: true }, ...ITEMS]}
          value={null}
          onChange={onChange}
        />
      </form>
    )
    await user.type(search(), 'beta{Enter}')
    expect(onChange).toHaveBeenCalledWith(2, ITEMS[1])
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Enter on a reopened single selector keeps the selected item', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RichSelector items={ITEMS} value={2} onChange={onChange} />)
    await user.click(search())
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith(2, ITEMS[1])
  })

  it('typing drops a highlight left by the mouse', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RichSelector
        items={[...ITEMS, { value: 4, label: 'Beta Filial' }]}
        value={null}
        onChange={onChange}
      />
    )
    await user.hover(option(/Filial/))
    await user.type(search(), 'beta{Enter}')
    expect(onChange).toHaveBeenCalledWith(2, ITEMS[1])
  })

  it('lists items by group, under one header each', () => {
    render(
      <RichSelector
        items={[
          { value: 'a', label: 'A', group: 'Um' },
          { value: 'b', label: 'B', group: 'Dois' },
          { value: 'c', label: 'C', group: 'Um' },
        ]}
        value={null}
        onChange={vi.fn()}
      />
    )
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
      'A',
      'C',
      'B',
    ])
    expect(screen.getAllByText('Um')).toHaveLength(1)
  })

  it('accepts renderItem, renderValue, footer and turns off search', () => {
    render(
      <RichSelector
        items={ITEMS}
        value={1}
        onChange={vi.fn()}
        searchable={false}
        renderItem={item => <b>item {item.label}</b>}
        renderValue={items => <i>valor {items[0]?.label}</i>}
        footer={<a href='/novo'>Novo</a>}
      />
    )
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.getByText('item Beta Ltda')).toBeTruthy()
    expect(screen.getByText('valor Ação Rápida')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Novo' })).toBeTruthy()
  })

  it('readOnly disables the trigger', () => {
    render(<RichSelector items={ITEMS} value={1} readOnly onChange={vi.fn()} />)
    expect((screen.getByRole('combobox') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('RichSelector multiple', () => {
  function Multiple(props: { maxSelected?: number; onChange?: (v: number[]) => void }) {
    const [value, setValue] = useState<number[]>([])
    return (
      <RichSelector<number>
        multiple
        items={ITEMS}
        value={value}
        maxSelected={props.maxSelected}
        labels={{ selected: n => `${n} itens` }}
        onChange={next => {
          setValue(next)
          props.onChange?.(next)
        }}
      />
    )
  }

  it('toggles items and summarizes the trigger', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Multiple onChange={onChange} />)
    await user.click(option(/Ação/))
    expect(screen.getByRole('combobox').textContent).toContain('Ação Rápida')
    await user.click(option(/Beta/))
    expect(screen.getByRole('combobox').textContent).toContain('2 itens')
    await user.click(option(/Ação/))
    expect(onChange).toHaveBeenLastCalledWith([2])
  })

  it('maxSelected disables the others, but a selected item can still be removed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Multiple maxSelected={1} onChange={onChange} />)
    await user.click(option(/Ação/))
    expect(option(/Beta/).getAttribute('aria-disabled')).toBe('true')
    await user.click(option(/Beta/))
    expect(onChange).toHaveBeenCalledTimes(1)
    await user.click(option(/Ação/))
    expect(onChange).toHaveBeenLastCalledWith([])
  })
})

describe('RichSelector with load', () => {
  const makeLoad = () =>
    vi.fn(async (term: string) =>
      ITEMS.filter(i => i.label.toLowerCase().includes(term.toLowerCase()))
    )

  it('loads, passes the selection to load and shows its label', async () => {
    const load = makeLoad()
    withQuery(
      <RichSelector<number>
        load={load}
        queryKey={['t1']}
        debounceMs={0}
        value={2}
        onChange={vi.fn()}
      />
    )
    await waitFor(() =>
      expect(screen.getByRole('combobox').textContent).toContain('Beta Ltda')
    )
    expect(load.mock.calls[0]?.[0]).toBe('')
    expect(load.mock.calls[0]?.[1]?.selected).toEqual([2])
  })

  it('sends the search to load, and the label survives a search that filters it out', async () => {
    const user = userEvent.setup()
    const load = makeLoad()
    withQuery(
      <RichSelector<number>
        load={load}
        queryKey={['t2']}
        debounceMs={0}
        value={2}
        onChange={vi.fn()}
      />
    )
    await waitFor(() => expect(option(/Beta/)).toBeTruthy())
    await user.type(search(), 'gama')
    await waitFor(() => expect(load).toHaveBeenCalledWith('gama', expect.anything()))
    await waitFor(() => expect(screen.queryByRole('option', { name: /Beta/ })).toBeNull())
    expect(screen.getByRole('combobox').textContent).toContain('Beta Ltda')
  })

  it('does not refetch when the settled load or a pick from the list changes the value', async () => {
    const user = userEvent.setup()
    const load = makeLoad()
    function Picker() {
      const [value, setValue] = useState<number | null>(2)
      return (
        <RichSelector<number>
          load={load}
          queryKey={['t3']}
          debounceMs={0}
          value={value}
          onChange={setValue}
        />
      )
    }
    withQuery(<Picker />)
    await waitFor(() => expect(option(/Ação/)).toBeTruthy())
    await user.click(option(/Ação/))
    await waitFor(() =>
      expect(screen.getByRole('combobox').textContent).toContain('Ação Rápida')
    )
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('refetches when a value with an unknown label arrives from outside', async () => {
    const load = vi.fn(async (_: string, ctx: { selected: number[] }) =>
      ctx.selected.includes(9) ? [{ value: 9, label: 'Fora da lista' }] : ITEMS
    )
    const ui = (value: number | null) => (
      <RichSelector<number>
        load={load}
        queryKey={['t4']}
        debounceMs={0}
        value={value}
        onChange={vi.fn()}
      />
    )
    const client = new QueryClient()
    const { rerender } = render(
      <QueryClientProvider client={client}>{ui(null)}</QueryClientProvider>
    )
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
    rerender(<QueryClientProvider client={client}>{ui(9)}</QueryClientProvider>)
    await waitFor(() =>
      expect(screen.getByRole('combobox').textContent).toContain('Fora da lista')
    )
  })

  it('lazy: no request until needed; selectedItems shows the label without one', () => {
    const load = makeLoad()
    withQuery(
      <RichSelector<number>
        lazy
        load={load}
        queryKey={['t5']}
        value={2}
        selectedItems={[{ value: 2, label: 'Já conhecido' }]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole('combobox').textContent).toContain('Já conhecido')
    expect(load).not.toHaveBeenCalled()
  })

  it('lazy still loads when the selected label is unknown', async () => {
    const load = makeLoad()
    withQuery(
      <RichSelector<number>
        lazy
        load={load}
        queryKey={['t6']}
        debounceMs={0}
        value={2}
        onChange={vi.fn()}
      />
    )
    await waitFor(() => expect(load).toHaveBeenCalled())
  })

  it('shows the error with a working retry', async () => {
    const user = userEvent.setup()
    const load = vi
      .fn<(term: string) => Promise<RichSelectorItem<number>[]>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(ITEMS)
    withQuery(
      <RichSelector<number>
        load={load}
        queryKey={['t7']}
        debounceMs={0}
        value={null}
        onChange={vi.fn()}
        labels={{ retry: 'De novo', error: 'Falhou' }}
      />
    )
    expect(await screen.findByRole('alert')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'De novo' }))
    await waitFor(() => expect(option(/Beta/)).toBeTruthy())
  })

  it('shows the empty text when nothing comes back', async () => {
    withQuery(
      <RichSelector<number>
        load={async () => []}
        queryKey={['t8']}
        debounceMs={0}
        value={null}
        onChange={vi.fn()}
        labels={{ empty: 'Nada aqui' }}
      />
    )
    expect(await screen.findByText('Nada aqui')).toBeTruthy()
  })
})

describe('RichSelectorField', () => {
  it('turns form values into a selection and emits the type the form stores', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RichSelectorField<number>
        items={ITEMS}
        value='2'
        valueType='string'
        onChange={onChange}
      />
    )
    expect(option(/Beta/).getAttribute('aria-selected')).toBe('true')
    await user.click(option(/Ação/))
    expect(onChange).toHaveBeenCalledWith('1')
  })

  it('valueType number converts, and empty form values mean no selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RichSelectorField<string>
        items={[{ value: '7', label: 'Sete' }]}
        value=''
        valueType='number'
        onChange={onChange}
      />
    )
    expect(screen.getByRole('combobox').textContent).not.toContain('Sete')
    await user.click(option(/Sete/))
    expect(onChange).toHaveBeenCalledWith(7)
  })

  it('emits arrays when multiple', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RichSelectorField<number>
        multiple
        items={ITEMS}
        value={['2']}
        valueType='string'
        onChange={onChange}
      />
    )
    await user.click(option(/Ação/))
    expect(onChange).toHaveBeenCalledWith(['2', '1'])
  })

  it('tolerates the extra config that `{...field}` carries', () => {
    const fieldConfig = { name: 'x', label: 'X', type: 'component', Component: () => null }
    render(<RichSelectorField<number> {...fieldConfig} items={ITEMS} value={1} />)
    expect(screen.getByRole('combobox').getAttribute('name')).toBeNull()
    expect(screen.getByRole('combobox').getAttribute('label')).toBeNull()
  })

  describe('dependsOn', () => {
    function Form({
      children,
      defaults,
      onReady,
    }: {
      children: ReactNode
      defaults: Record<string, unknown>
      onReady: (set: (name: string, value: unknown) => void) => void
    }) {
      const form = useForm({ defaultValues: defaults })
      onReady(form.setValue as (name: string, value: unknown) => void)
      return <FormProvider {...form}>{children}</FormProvider>
    }

    const setup = (props: {
      requireDeps?: boolean
      clearOnDepsChange?: boolean
      value?: unknown
      clientId?: string
    }) => {
      const load = vi.fn(
        async (_: string, ctx: { deps: Record<string, unknown> }) => [
          { value: 1, label: `Do cliente ${String(ctx.deps.clientId)}` },
        ]
      )
      const onChange = vi.fn()
      let setValue: (name: string, value: unknown) => void = () => {}
      withQuery(
        <Form
          defaults={{ clientId: props.clientId }}
          onReady={set => {
            setValue = set
          }}
        >
          <RichSelectorField<number>
            dependsOn='clientId'
            queryKey={['deps', props.clientId, props.requireDeps, props.clearOnDepsChange]}
            debounceMs={0}
            load={load}
            value={props.value}
            onChange={onChange}
            requireDeps={props.requireDeps}
            clearOnDepsChange={props.clearOnDepsChange}
          />
        </Form>
      )
      return { load, onChange, set: (v: unknown) => setValue('clientId', v) }
    }

    it('passes the watched values to load and reloads when they change', async () => {
      const { set } = setup({ clientId: 'A' })
      await waitFor(() => expect(option(/cliente A/)).toBeTruthy())
      set('B')
      await waitFor(() => expect(option(/cliente B/)).toBeTruthy())
    })

    it('requireDeps keeps it disabled until the dependency has a value', async () => {
      const { set } = setup({ requireDeps: true })
      const trigger = screen.getByRole('combobox') as HTMLButtonElement
      expect(trigger.disabled).toBe(true)
      set('A')
      await waitFor(() =>
        expect((screen.getByRole('combobox') as HTMLButtonElement).disabled).toBe(false)
      )
    })

    it('clearOnDepsChange clears when A becomes B, not when the form first fills it', async () => {
      const { set, onChange } = setup({ clearOnDepsChange: true, value: 1 })
      set('A')
      await waitFor(() => expect(option(/cliente A/)).toBeTruthy())
      expect(onChange).not.toHaveBeenCalled()
      set('B')
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(null))
    })

    it('without clearOnDepsChange the selection stays', async () => {
      const { set, onChange } = setup({ clientId: 'A', value: 1 })
      await waitFor(() => expect(option(/cliente A/)).toBeTruthy())
      set('B')
      await waitFor(() => expect(option(/cliente B/)).toBeTruthy())
      expect(onChange).not.toHaveBeenCalled()
    })
  })
})

describe('RichSelector with a cached list', () => {
  it('shows the label again when remounted over the same cache', async () => {
    const client = new QueryClient()
    const load = vi.fn(async () => ITEMS)
    const ui = (
      <QueryClientProvider client={client}>
        <RichSelector<number>
          load={load}
          queryKey={['cached']}
          value={1}
          onChange={vi.fn()}
        />
      </QueryClientProvider>
    )
    const first = render(ui)
    await waitFor(() =>
      expect(screen.getByRole('combobox').textContent).toContain('Ação')
    )
    first.unmount()
    render(ui)
    expect(screen.getByRole('combobox').textContent).toContain('Ação')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('marks its query so a global error toast skips it', async () => {
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <RichSelector<number>
          load={async () => ITEMS}
          queryKey={['meta']}
          value={null}
          onChange={vi.fn()}
        />
      </QueryClientProvider>
    )
    expect(client.getQueryCache().getAll()[0]?.meta).toEqual({
      skipErrorToast: true,
    })
  })

  it('Enter waits for the search to settle instead of picking from the old list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    withQuery(
      <RichSelector<number>
        load={async term =>
          ITEMS.filter(item => !term || item.label.includes(term))
        }
        queryKey={['settling']}
        value={null}
        onChange={onChange}
        debounceMs={50}
      />
    )
    await waitFor(() => expect(option(/Ação/)).toBeTruthy())
    await user.type(search(), 'Beta{Enter}')
    expect(onChange).not.toHaveBeenCalled()

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    await waitFor(() => expect(search().getAttribute('aria-busy')).toBeNull())
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith(2, ITEMS[1])
  })
})

describe('RichSelector trigger without a known label', () => {
  it('shows a spinner, not the placeholder, while the label loads', () => {
    withQuery(
      <RichSelector<number>
        load={() => new Promise(() => {})}
        queryKey={['pending']}
        value={1}
        onChange={vi.fn()}
        labels={{ placeholder: 'Escolha' }}
      />
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger.textContent).not.toContain('Escolha')
    expect(trigger.getAttribute('aria-busy')).toBe('true')
  })

  it('shows the raw value when load never returns the selected item', async () => {
    withQuery(
      <RichSelector<number>
        load={async () => ITEMS}
        queryKey={['absent']}
        value={77}
        onChange={vi.fn()}
        labels={{ placeholder: 'Escolha' }}
      />
    )
    await waitFor(() =>
      expect(screen.getByRole('combobox').textContent).toContain('77')
    )
    expect(screen.getByRole('combobox').textContent).not.toContain('Escolha')
  })

  it('counts a multiple selection even with no known label', async () => {
    withQuery(
      <RichSelector<number>
        multiple
        load={async () => []}
        queryKey={['absent-many']}
        value={[77, 78]}
        onChange={vi.fn()}
        labels={{ selected: count => `${count} itens` }}
      />
    )
    await waitFor(() =>
      expect(screen.getByRole('combobox').textContent).toContain('2 itens')
    )
  })
})

describe('RichSelector grouping', () => {
  it('lists items without a group first, so none looks part of a group', () => {
    render(
      <RichSelector
        items={[
          { value: 'a', label: 'A', group: 'Um' },
          { value: 'b', label: 'B' },
        ]}
        value={null}
        onChange={vi.fn()}
      />
    )
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
      'B',
      'A',
    ])
  })
})

describe('RichSelectorField form props', () => {
  it('takes placeholder, and an explicit label placeholder still wins', () => {
    const { rerender } = render(
      <RichSelectorField items={ITEMS} placeholder='Do form' />
    )
    expect(screen.getByRole('combobox').textContent).toContain('Do form')
    rerender(
      <RichSelectorField
        items={ITEMS}
        placeholder='Do form'
        labels={{ placeholder: 'Explícito' }}
      />
    )
    expect(screen.getByRole('combobox').textContent).toContain('Explícito')
  })

  it('names the trigger after the form label unless aria-label is set', () => {
    const { rerender } = render(<RichSelectorField items={ITEMS} label='Cliente' />)
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toBeTruthy()
    rerender(<RichSelectorField items={ITEMS} label='Cliente' aria-label='Outro' />)
    expect(screen.getByRole('combobox', { name: 'Outro' })).toBeTruthy()
  })

  it('uses the field name as id, because the form Label points at it', () => {
    render(<RichSelectorField items={ITEMS} name='clienteId' id='form-1' />)
    expect(screen.getByRole('combobox').id).toBe('clienteId')
  })

  it('keeps an explicit id outside a form', () => {
    render(<RichSelectorField items={ITEMS} id='solto' />)
    expect(screen.getByRole('combobox').id).toBe('solto')
  })

  it('takes the error state from either form', () => {
    const { rerender } = render(
      <RichSelectorField items={ITEMS} hasError aria-describedby='erro' />
    )
    const trigger = () => screen.getByRole('combobox')
    expect(trigger().getAttribute('aria-invalid')).toBe('true')
    expect(trigger().getAttribute('aria-describedby')).toBe('erro')
    rerender(<RichSelectorField items={ITEMS} aria-invalid='true' />)
    expect(trigger().getAttribute('aria-invalid')).toBe('true')
    rerender(<RichSelectorField items={ITEMS} required />)
    expect(trigger().getAttribute('aria-required')).toBe('true')
  })

  it('autofocuses with focus: true', () => {
    render(<RichSelectorField items={ITEMS} focus />)
    expect(document.activeElement).toBe(screen.getByRole('combobox'))
  })

  it('reaches the trigger through ref', () => {
    const ref = vi.fn()
    render(<RichSelectorField items={ITEMS} ref={ref} />)
    expect(ref).toHaveBeenCalledWith(screen.getByRole('combobox'))
  })

  it('does not open on hover unless asked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <RichSelectorField items={ITEMS} onOpenChange={onOpenChange} />
    )
    await user.hover(screen.getByRole('combobox'))
    expect(onOpenChange).not.toHaveBeenCalled()
    await user.unhover(screen.getByRole('combobox'))

    rerender(<RichSelectorField items={ITEMS} onOpenChange={onOpenChange} openOnHover />)
    await user.hover(screen.getByRole('combobox'))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('hands over the picked items through onItemsChange', async () => {
    const user = userEvent.setup()
    const onItemsChange = vi.fn()
    const { rerender } = render(
      <RichSelectorField items={ITEMS} onItemsChange={onItemsChange} />
    )
    await user.click(option(/Beta/))
    expect(onItemsChange).toHaveBeenLastCalledWith([ITEMS[1]])

    rerender(
      <RichSelectorField items={ITEMS} multiple value={[1]} onItemsChange={onItemsChange} />
    )
    await user.click(option(/Beta/))
    expect(onItemsChange).toHaveBeenLastCalledWith([ITEMS[0], ITEMS[1]])
  })
})
