import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Building2, Truck } from 'lucide-react'
import { RichSelector, type RichSelectorItem } from './RichSelector'

const CLIENTS: RichSelectorItem<number>[] = [
  { value: 1, label: 'Transportes Ação', description: '11.222.333/0001-81', group: 'Matriz' },
  { value: 2, label: 'Beta Logística', description: '22.333.444/0001-05', group: 'Matriz' },
  { value: 3, label: 'Beta Filial Natal', description: '22.333.444/0002-96', group: 'Filial' },
  { value: 4, label: 'Gama (inativo)', description: 'Contrato encerrado', group: 'Filial', disabled: true },
]

/** Server-side search: returns only what matches the term, like a real API. */
const load = async (search: string) => {
  await new Promise(resolve => setTimeout(resolve, 300))
  return CLIENTS.filter(client =>
    client.label.toLowerCase().includes(search.toLowerCase())
  )
}

const meta: Meta<typeof RichSelector> = {
  title: 'Selectors/RichSelector',
  component: RichSelector,
}
export default meta
type Story = StoryObj<typeof RichSelector>

function Single(props: { mono?: boolean }) {
  const [value, setValue] = useState<number | null>(1)
  return (
    <div className='w-80'>
      <RichSelector<number>
        items={CLIENTS}
        value={value}
        onChange={setValue}
        icon={props.mono ? Truck : Building2}
        mono={props.mono}
      />
    </div>
  )
}

export const LocalList: Story = { render: () => <Single /> }
export const MonospaceTitle: Story = { render: () => <Single mono /> }

export const ServerSearch: Story = {
  render: function Render() {
    const [value, setValue] = useState<number | null>(null)
    return (
      <div className='w-80'>
        <RichSelector<number>
          load={load}
          queryKey={['stories', 'clients']}
          value={value}
          onChange={setValue}
          icon={Building2}
          labels={{ placeholder: 'Selecione o cliente', none: 'Sem cliente' }}
        />
      </div>
    )
  },
}

export const Multiple: Story = {
  render: function Render() {
    const [value, setValue] = useState<number[]>([])
    return (
      <div className='w-80'>
        <RichSelector<number>
          multiple
          maxSelected={2}
          items={CLIENTS}
          value={value}
          onChange={setValue}
          footer={
            <a className='block px-2 py-1 text-xs hover:underline' href='#novo'>
              Novo cliente
            </a>
          }
        />
      </div>
    )
  },
}
