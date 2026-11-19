import type { Meta, StoryObj } from '@storybook/react'
import { useForm, FieldValues } from 'react-hook-form'
import { MultiSelect } from './MultiSelect'

const ESTOQUE = [
  { value: '147', label: 'ÔNIBUS OSM0852' },
  { value: '11', label: '0011 - RHS9I23' },
  { value: '23', label: '0023 - PQR4A56' },
  { value: '31', label: 'CAMINHÃO TDF7B89' },
  { value: '42', label: '0042 - LKJ1C23' },
  { value: '55', label: 'VAN MNO5D67' },
]

/** Server-side search: returns only what matches the term — like the real API. */
const loadOptions = async (search?: string) => {
  await new Promise(r => setTimeout(r, 200))
  if (!search) return ESTOQUE
  return ESTOQUE.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )
}

function Harness({ selecionados = [] }: { selecionados?: string[] }) {
  // react-hook-form's watch() returns functions the compiler can't memoize
  // (documented incompatible-library case).
  'use no memo'

  const { control, watch } = useForm<FieldValues>({
    defaultValues: { produtos: selecionados },
  })
  return (
    <div className='max-w-md space-y-4 p-6'>
      <MultiSelect
        control={control}
        name='produtos'
        label='Produtos'
        loadOptions={loadOptions}
      />
      <pre className='text-xs text-muted-foreground'>
        {/* eslint-disable-next-line react-hooks/incompatible-library -- watch() returns a subscription API the compiler can't memoize; 'use no memo' above documents the opt-out but this eslint-plugin-react-hooks version still reports the diagnostic regardless (verified empirically), so the disable is the only way to silence it. */}
        {JSON.stringify(watch('produtos'))}
      </pre>
    </div>
  )
}

const meta = {
  title: 'Components/MultiSelect',
  component: Harness,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Seleção múltipla com busca assíncrona (server-side). O gatilho mostra os rótulos do que está selecionado (até 3, depois "+N") — os rótulos vêm de um cache por value, então não somem quando a busca filtra as opções.',
      },
    },
  },
} satisfies Meta<typeof Harness>

export default meta
type Story = StoryObj<typeof meta>

export const Vazio: Story = { args: {} }

/** 4+ selected: 3 labels + "+N". Type in the search — the labels stay. */
export const MuitosSelecionados: Story = {
  args: { selecionados: ['147', '11', '23', '31', '42'] },
}
