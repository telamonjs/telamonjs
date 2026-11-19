import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ImpersonationBanner } from './ImpersonationBanner'
import { ImpersonationDialog } from './ImpersonationDialog'
import type { ImpersonationUserOption } from './ImpersonationDialog'
import { Button } from '../../ui/button'

const meta = {
  title: 'Components/Impersonation',
  component: ImpersonationBanner,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Componentes genéricos de impersonation: a faixa persistente de alerta (`ImpersonationBanner`) e o seletor de usuário (`ImpersonationDialog`). Ambos recebem dados e callbacks por props — sem acoplamento a nenhum app.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ImpersonationBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Banner: Story = {
  args: {
    isImpersonating: true,
    currentUserName: 'Maria Souza',
    originalUserName: 'Admin Geral',
    onStop: () => alert('voltar ao original'),
  },
}

export const BannerPending: Story = {
  args: { ...Banner.args, isPending: true },
}

/** Without `isImpersonating` the component renders nothing. */
export const BannerHidden: Story = {
  args: { ...Banner.args, isImpersonating: false },
}

const USERS: ImpersonationUserOption[] = [
  {
    id: '1',
    label: 'Maria Souza',
    description: 'maria@acme.com · Supervisora',
  },
  { id: '2', label: 'João Lima', description: 'joao@acme.com · Agente' },
  { id: '3', label: 'Ana Castro', description: 'ana@acme.com · Financeiro' },
  { id: '4', label: 'Conta bloqueada', description: 'inativa', disabled: true },
]

function DialogHarness({ failing = false }: { failing?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <div className='p-6'>
      <Button onClick={() => setOpen(true)}>Abrir dialog</Button>
      <ImpersonationDialog
        open={open}
        onOpenChange={setOpen}
        searchUsers={async term => {
          await new Promise(r => setTimeout(r, 400))
          return USERS.filter(u =>
            u.label.toLowerCase().includes(term.toLowerCase())
          )
        }}
        onConfirm={async userId => {
          await new Promise(r => setTimeout(r, 600))
          return failing
            ? {
                ok: false,
                message: 'Usuário sem permissão para ser impersonado',
              }
            : { ok: true, message: `impersonando ${userId}` }
        }}
      />
    </div>
  )
}

export const Dialog: StoryObj = {
  render: () => <DialogHarness />,
}

/** `onConfirm` returning `{ ok: false }` keeps the dialog open with the message. */
export const DialogWithError: StoryObj = {
  render: () => <DialogHarness failing />,
}
