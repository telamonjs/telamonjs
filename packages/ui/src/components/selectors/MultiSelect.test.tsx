/**
 * MultiSelect Tests — async search characterization
 *
 * Regression: cmdk's client-side filter (shouldFilter default) wiped out the
 * items mounted asynchronously via loadOptions — any typed text emptied the
 * dropdown even with the server returning results.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../../test/test-utils'
// test-utils shadows RTL's waitFor with a sleep(ms) helper (its callback never
// runs) — the cascade tests below need the real one.
import { waitFor as waitForReal, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, FieldValues, FormProvider } from 'react-hook-form'
import { MultiSelect } from './MultiSelect'

const OPTIONS = [
  { value: '147', label: 'ÔNIBUS OSM0852' },
  { value: '11', label: '0011 - RHS9I23' },
]

function Harness({
  loadOptions,
}: {
  loadOptions: (search?: string) => Promise<{ value: string; label: string }[]>
}) {
  const { control } = useForm<FieldValues>({
    defaultValues: { produtos: [] },
  })
  return (
    <MultiSelect control={control} name='produtos' loadOptions={loadOptions} />
  )
}

describe('MultiSelect (async search)', () => {
  it('mantém visíveis os itens retornados pelo loadOptions após digitar', async () => {
    const user = userEvent.setup()
    const loadOptions = vi.fn(async (search?: string) =>
      search
        ? OPTIONS.filter(o =>
            o.label.toLowerCase().includes(search.toLowerCase())
          )
        : OPTIONS
    )

    render(<Harness loadOptions={loadOptions} />)

    // Open the popover
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => {
      expect(screen.getByText('ÔNIBUS OSM0852')).toBeInTheDocument()
    })

    // Type a term the "server" resolves — cmdk must not discard it
    await user.type(screen.getByPlaceholderText('Filtrar...'), 'OSM0852')

    await waitFor(
      () => {
        expect(loadOptions).toHaveBeenCalledWith(
          'OSM0852',
          expect.anything(),
          undefined
        )
        expect(screen.getByText('ÔNIBUS OSM0852')).toBeInTheDocument()
        // Inside the waitFor: the call above happens before the response renders,
        // and the item filtered out by the "server" is still on screen until then
        expect(screen.queryByText('0011 - RHS9I23')).not.toBeInTheDocument()
      },
      { timeout: 2000 } // internal 300ms debounce
    )
  })

  it('mostra os rótulos dos selecionados no gatilho, não "N selecionados"', async () => {
    const user = userEvent.setup()
    const loadOptions = vi.fn(async () => OPTIONS)

    render(<Harness loadOptions={loadOptions} />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await user.click(
      await screen.findByText('ÔNIBUS OSM0852', {}, { timeout: 3000 })
    )
    await user.click(await screen.findByText('0011 - RHS9I23'))

    // regression: with 2+ items the trigger collapsed into "2 selecionados"
    await waitFor(() => {
      expect(trigger).toHaveTextContent('ÔNIBUS OSM0852')
      expect(trigger).toHaveTextContent('0011 - RHS9I23')
    })
    expect(trigger).not.toHaveTextContent('selecionados')
  })

  it('alinha os rótulos selecionados à esquerda no gatilho', async () => {
    // regression: the badges sit inside a <button>, inherited the browser's
    // text-align: center and showed up centered in the field. jsdom has no
    // layout, so the class that pins the alignment is what we can assert.
    const user = userEvent.setup()
    render(<Harness loadOptions={vi.fn(async () => OPTIONS)} />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await user.click(
      await screen.findByText('ÔNIBUS OSM0852', {}, { timeout: 3000 })
    )

    const badge = await waitForReal(() =>
      within(trigger).getByText('ÔNIBUS OSM0852')
    )
    expect(badge.parentElement).toHaveClass('text-left')
  })

  it('não refaz a busca de opções ao marcar um item', async () => {
    const user = userEvent.setup()
    const loadOptions = vi.fn(async () => OPTIONS)

    render(<Harness loadOptions={loadOptions} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(
      await screen.findByText('ÔNIBUS OSM0852', {}, { timeout: 3000 })
    )
    const callsAfterSelect = loadOptions.mock.calls.length
    // past the 300ms debounce: a refetch would have fired by now
    await new Promise(r => setTimeout(r, 500))
    expect(loadOptions).toHaveBeenCalledTimes(callsAfterSelect)
  })

  describe('dependsOn (cascata)', () => {
    // Mirrors combobox.tsx: the 3rd arg of loadOptions must be the VALUE of the
    // field named by `dependsOn`, not the field name (regression: consumer app
    // "Áreas Atendidas" listed the vagas of every processo).
    function CascadeHarness({
      loadOptions,
      initial = {},
    }: {
      loadOptions: (
        search?: string,
        id?: string,
        dependsOn?: string
      ) => Promise<{ value: string; label: string }[]>
      initial?: FieldValues
    }) {
      // react-hook-form's methods.watch() returns functions the compiler
      // can't memoize (documented incompatible-library case).
      'use no memo'

      const methods = useForm<FieldValues>({
        defaultValues: { processoId: undefined, vagaIds: [], ...initial },
      })
      return (
        <FormProvider {...methods}>
          <button onClick={() => methods.setValue('processoId', 'p1')}>
            set p1
          </button>
          <button onClick={() => methods.setValue('processoId', 'p2')}>
            set p2
          </button>
          <MultiSelect
            name='vagaIds'
            dependsOn='processoId'
            loadOptions={loadOptions}
            placeholder='Escolha o processo primeiro'
          />
          <output data-testid='vagaIds'>
            {/* eslint-disable-next-line react-hooks/incompatible-library -- watch() returns a subscription API the compiler can't memoize; 'use no memo' above documents the opt-out but this eslint-plugin-react-hooks version still reports the diagnostic regardless (verified empirically), so the disable is the only way to silence it. */}
            {JSON.stringify(methods.watch('vagaIds'))}
          </output>
        </FormProvider>
      )
    }

    it('fica desabilitado até o campo dependente ter valor e repassa o VALOR ao loadOptions', async () => {
      const user = userEvent.setup()
      const loadOptions = vi.fn(
        async (_s?: string, _id?: string, dep?: string) =>
          dep === 'p1' ? OPTIONS : []
      )

      render(<CascadeHarness loadOptions={loadOptions} />)

      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeDisabled()
      expect(trigger).toHaveTextContent('Escolha o processo primeiro')

      await user.click(screen.getByText('set p1'))

      await waitForReal(() => expect(trigger).toBeEnabled())
      await waitForReal(
        () =>
          expect(loadOptions).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            'p1'
          ),
        { timeout: 2000 }
      )
      expect(loadOptions).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'processoId'
      )
    })

    it('limpa a seleção quando o campo dependente muda', async () => {
      const user = userEvent.setup()
      const loadOptions = vi.fn(async () => OPTIONS)

      render(
        <CascadeHarness
          loadOptions={loadOptions}
          initial={{ processoId: 'p1', vagaIds: ['147'] }}
        />
      )

      // edit mode: mounting with both values set must NOT clear the selection
      await waitForReal(() =>
        expect(screen.getByRole('combobox')).toHaveTextContent('ÔNIBUS OSM0852')
      )
      expect(screen.getByTestId('vagaIds')).toHaveTextContent('["147"]')

      await user.click(screen.getByText('set p2'))

      await waitForReal(() =>
        expect(screen.getByTestId('vagaIds')).toHaveTextContent('[]')
      )
      await waitForReal(
        () =>
          expect(loadOptions).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            'p2'
          ),
        { timeout: 2000 }
      )
    })
  })

  // The 'search filters and the selected item's label disappears' case is not testable here:
  // the global CommandInput mock ignores onValueChange (the search never changes) and
  // StrictMode re-fires the load effect, so `data` shrinks and comes back. Covered
  // by inspection: the trigger reads knownLabels (cache), not `data`.
})
