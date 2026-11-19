import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { z } from 'zod'
import type { CrudConfig } from '../types/crud'
import type { FormSection } from '../types/forms/admin-form'
import { CreateForm } from '../components/forms/CreateForm'
import { renderWithProviders } from '../test/test-utils'
import { withScope } from './with-scope'

type Row = { id: string; nome: string; clienteId: string; unidadeId?: string }

function makeConfig(sections: FormSection | FormSection[]): CrudConfig<Row> {
  return {
    module: { title: 'Contatos', description: '', route: '/contatos' },
    list: {
      columns: [
        { accessorKey: 'nome', header: 'Nome' },
        { accessorKey: 'clienteId', header: 'Cliente' },
        { id: 'unidadeId', header: 'Unidade' },
      ],
      toolbar: {
        filters: [
          { key: 'clienteId', label: 'Cliente', options: [] },
          { key: 'ativo', label: 'Ativo', options: [] },
        ],
      },
    },
    form: { sections, validation: z.object({}) },
    query: {
      queryKey: ['contatos'],
      queryFn: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    },
    mutations: {
      create: {
        mutationFn: vi.fn().mockResolvedValue({ success: true }),
        invalidates: [['contatos']],
      },
      update: {
        mutationFn: vi.fn().mockResolvedValue({ success: true }),
        invalidates: [['contatos']],
      },
      delete: {
        mutationFn: vi.fn().mockResolvedValue({ success: true }),
        invalidates: [['contatos']],
      },
    },
    dialogs: {
      create: { title: 'Novo', defaultValues: { ativo: true } as Partial<Row> },
    },
  } as CrudConfig<Row>
}

const flatSections: FormSection[] = [
  {
    label: 'Dados',
    fields: [
      { name: 'nome', label: 'Nome', type: 'text' },
      { name: 'clienteId', label: 'Cliente', type: 'relationship' },
    ],
  },
]
const rowSections: FormSection = {
  label: 'Dados',
  fields: [
    [
      { name: 'nome', label: 'Nome', type: 'text' },
      { name: 'clienteId', label: 'Cliente', type: 'relationship' },
    ],
    [{ name: 'email', label: 'E-mail', type: 'text' }],
  ],
}

const fieldNames = (sections: unknown): string[] =>
  JSON.stringify(sections)
    .match(/"name":"[^"]+"/g)
    ?.map(s => s.slice(8, -1)) ?? []

describe('withScope', () => {
  it('sends the scope filters to queryFn and appends them to the queryKey, dropping empty values', async () => {
    const base = makeConfig(flatSections)
    const scoped = withScope(base, {
      filters: {
        clienteId: 'c1',
        unidadeId: null,
        busca: '',
        x: undefined,
        zero: 0,
      },
    })

    expect(scoped.query.queryKey).toEqual([
      'contatos',
      { clienteId: 'c1', zero: 0 },
    ])
    await scoped.query.queryFn({
      page: 2,
      pageSize: 10,
      filters: { ativo: 'true' },
    })
    expect(base.query.queryFn).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      filters: { ativo: 'true', clienteId: 'c1', zero: 0 },
    })
  })

  it('merges create defaultValues: base + defaults + locked', () => {
    const scoped = withScope(makeConfig(flatSections), {
      filters: {},
      defaults: { x: 1 },
      locked: { clienteId: 'c1' },
    })
    expect(scoped.dialogs?.create?.defaultValues).toEqual({
      ativo: true,
      x: 1,
      clienteId: 'c1',
    })
  })

  it('does not create dialogs.create when the base has none', () => {
    const base = makeConfig(flatSections)
    delete base.dialogs
    const scoped = withScope(base, { filters: {}, locked: { clienteId: 'c1' } })
    expect(scoped.dialogs).toBeUndefined()
  })

  it('removes locked fields from flat sections', () => {
    const scoped = withScope(makeConfig(flatSections), {
      filters: {},
      locked: { clienteId: 'c1' },
    })
    expect(fieldNames(scoped.form.sections)).toEqual(['nome'])
  })

  it('removes locked fields from row-based sections (single section object)', () => {
    const scoped = withScope(makeConfig(rowSections), {
      filters: {},
      locked: { clienteId: 'c1' },
    })
    const section = scoped.form.sections as FormSection
    expect(section.fields).toEqual([
      [{ name: 'nome', label: 'Nome', type: 'text' }],
      [{ name: 'email', label: 'E-mail', type: 'text' }],
    ])
  })

  it('removes locked columns (accessorKey or id) and toolbar filters', () => {
    const scoped = withScope(makeConfig(flatSections), {
      filters: {},
      locked: { clienteId: 'c1', unidadeId: 'u1' },
    })
    expect(
      scoped.list.columns.map(c => ('accessorKey' in c ? c.accessorKey : c.id))
    ).toEqual(['nome'])
    expect(scoped.list.toolbar?.filters?.map(f => f.key)).toEqual(['ativo'])
  })

  it('injects locked values into the create payload even when absent', async () => {
    const base = makeConfig(flatSections)
    const scoped = withScope(base, { filters: {}, locked: { clienteId: 'c1' } })
    await scoped.mutations.create!.mutationFn({ nome: 'A' } as Row)
    expect(base.mutations.create!.mutationFn).toHaveBeenCalledWith({
      nome: 'A',
      clienteId: 'c1',
    })
  })

  it('appends scope.invalidates to create/update/delete keeping the existing ones', () => {
    const scoped = withScope(makeConfig(flatSections), {
      filters: {},
      invalidates: [['clientes', 'c1']],
    })
    for (const m of [
      scoped.mutations.create!,
      scoped.mutations.update!,
      scoped.mutations.delete!,
    ]) {
      expect(m.invalidates).toEqual([['contatos'], ['clientes', 'c1']])
    }
  })

  it('treats a locked undefined as not provided: no override, no payload key, field/column/filter kept', async () => {
    const base = makeConfig(flatSections)
    const scoped = withScope(base, {
      filters: {},
      locked: { clienteId: undefined, ativo: undefined, unidadeId: null },
    })
    expect(scoped.dialogs?.create?.defaultValues).toEqual({
      ativo: true,
      unidadeId: null,
    })
    expect(fieldNames(scoped.form.sections)).toEqual(['nome', 'clienteId'])
    expect(
      scoped.list.columns.map(c => ('accessorKey' in c ? c.accessorKey : c.id))
    ).toEqual(['nome', 'clienteId'])
    expect(scoped.list.toolbar?.filters?.map(f => f.key)).toEqual([
      'clienteId',
      'ativo',
    ])
    await scoped.mutations.create!.mutationFn({ nome: 'A' } as Row)
    const payload = vi.mocked(base.mutations.create!.mutationFn).mock
      .calls[0][0] as Record<string, unknown>
    expect(payload).toEqual({ nome: 'A', unidadeId: null })
    expect('clienteId' in payload).toBe(false)
  })

  it('removes a column when either accessorKey or id is locked', () => {
    const base = makeConfig(flatSections)
    base.list.columns = [
      { accessorKey: 'nome', header: 'Nome' },
      { accessorKey: 'cliente.nome', id: 'clienteId', header: 'Cliente' },
    ] as typeof base.list.columns
    const scoped = withScope(base, { filters: {}, locked: { clienteId: 'c1' } })
    expect(scoped.list.columns).toHaveLength(1)
  })

  it('removes locked fields from an array of row-based sections (FormField[][])', () => {
    const scoped = withScope(makeConfig([rowSections]), {
      filters: {},
      locked: { clienteId: 'c1' },
    })
    const [section] = scoped.form.sections as FormSection[]
    expect(section.fields).toEqual([
      [{ name: 'nome', label: 'Nome', type: 'text' }],
      [{ name: 'email', label: 'E-mail', type: 'text' }],
    ])
  })

  it('works when the base has no update/delete mutations', async () => {
    const base = makeConfig(flatSections)
    delete base.mutations.update
    delete base.mutations.delete
    const scoped = withScope(base, {
      filters: {},
      locked: { clienteId: 'c1' },
      invalidates: [['clientes', 'c1']],
    })
    expect(scoped.mutations.update).toBeUndefined()
    expect(scoped.mutations.delete).toBeUndefined()
    expect(scoped.mutations.create!.invalidates).toEqual([
      ['contatos'],
      ['clientes', 'c1'],
    ])
    await scoped.mutations.create!.mutationFn({ nome: 'A' } as Row)
    expect(base.mutations.create!.mutationFn).toHaveBeenCalledWith({
      nome: 'A',
      clienteId: 'c1',
    })
  })

  it('treats a defaults undefined as not provided (keeps the base default)', () => {
    const scoped = withScope(makeConfig(flatSections), {
      filters: {},
      defaults: { ativo: undefined, x: 1 },
    })
    expect(scoped.dialogs?.create?.defaultValues).toEqual({ ativo: true, x: 1 })
  })

  it('drops a section that only held locked fields', () => {
    const scoped = withScope(
      makeConfig([
        ...flatSections,
        {
          label: 'Pai',
          fields: [
            { name: 'clienteId', label: 'Cliente', type: 'relationship' },
          ],
        },
      ]),
      { filters: {}, locked: { clienteId: 'c1' } }
    )
    expect((scoped.form.sections as FormSection[]).map(s => s.label)).toEqual([
      'Dados',
    ])
  })

  it('drops a row that only held locked fields', () => {
    const scoped = withScope(
      makeConfig({
        label: 'Dados',
        fields: [
          [{ name: 'nome', label: 'Nome', type: 'text' }],
          [{ name: 'clienteId', label: 'Cliente', type: 'relationship' }],
        ],
      }),
      { filters: {}, locked: { clienteId: 'c1' } }
    )
    expect((scoped.form.sections as FormSection).fields).toEqual([
      [{ name: 'nome', label: 'Nome', type: 'text' }],
    ])
  })

  it('does not mutate the input config', () => {
    const base = makeConfig(rowSections)
    const before = JSON.stringify(base)
    const { queryFn } = base.query
    const createFn = base.mutations.create!.mutationFn
    withScope(base, {
      filters: { clienteId: 'c1' },
      locked: { clienteId: 'c1' },
      defaults: { x: 1 },
      invalidates: [['clientes']],
    })
    expect(JSON.stringify(base)).toBe(before)
    expect(base.query.queryFn).toBe(queryFn)
    expect(base.mutations.create!.mutationFn).toBe(createFn)
  })

  it('CreateForm: locked field is hidden and a dependsOn sibling receives its value', async () => {
    const loadUnidades = vi.fn().mockResolvedValue([])
    const sections: FormSection[] = [
      {
        label: 'Dados',
        fields: [
          { name: 'nome', label: 'Nome', type: 'text' },
          {
            name: 'clienteId',
            label: 'Cliente',
            type: 'relationship',
            loadField: vi.fn().mockResolvedValue([]),
          },
          {
            name: 'unidadeId',
            label: 'Unidade',
            type: 'relationship',
            dependsOn: 'clienteId',
            loadField: loadUnidades as never,
          },
        ],
      },
    ]
    const scoped = withScope(makeConfig(sections), {
      filters: {},
      locked: { clienteId: 'c1' },
    })

    renderWithProviders(
      <CreateForm
        sections={scoped.form.sections as FormSection[]}
        defaultValues={
          scoped.dialogs?.create?.defaultValues as Record<string, unknown>
        }
        onSubmitValues={vi.fn()}
      />
    )

    await waitFor(() => expect(loadUnidades).toHaveBeenCalled())
    expect(loadUnidades.mock.calls.at(-1)?.[2]).toBe('c1')
    expect(screen.queryByText('Cliente')).not.toBeInTheDocument()
    expect(screen.getByText('Unidade')).toBeInTheDocument()
  })
})
