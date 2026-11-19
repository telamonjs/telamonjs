/**
 * Tests for the generic impersonation components.
 *
 * Covers the public contract described in the CHANGELOG: the banner only
 * appears when `isImpersonating`, the click calls `onStop`, `isPending`
 * disables the button; and the dialog searches with debounce, filters by
 * term, requires a selection to confirm, and shows the error message
 * returned by `onConfirm`.
 *
 * `Button`/`Input`/`Label`/`Dialog` arrive here as the global stand-ins from
 * `src/test/ui-mocks.tsx` — except in the accessibility block, where
 * `../../ui/button` is unmocked so axe sees real markup (same pattern as
 * ModernSidebar.behaviors.test.tsx).
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'
import type { AxeMatchers } from 'vitest-axe/matchers'
import { ImpersonationBanner } from './ImpersonationBanner'
import { ImpersonationDialog } from './ImpersonationDialog'
import type { ImpersonationUserOption } from './ImpersonationDialog'

expect.extend(axeMatchers)

declare module 'vitest' {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// ─────────────────────────────────────────────────────────────────────────────
// ImpersonationBanner
// ─────────────────────────────────────────────────────────────────────────────

describe('ImpersonationBanner', () => {
  it('não renderiza nada quando isImpersonating é falso', () => {
    const { container } = render(
      <ImpersonationBanner
        isImpersonating={false}
        currentUserName='Maria'
        originalUserName='Admin'
        onStop={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra quem está sendo impersonado e para quem se volta', () => {
    render(
      <ImpersonationBanner
        isImpersonating
        currentUserName='Maria Souza'
        originalUserName='Admin Geral'
        onStop={vi.fn()}
      />
    )

    const banner = screen.getByTestId('impersonation-banner')
    expect(banner).toHaveTextContent('Modo impersonation')
    expect(banner).toHaveTextContent('Maria Souza')
    expect(banner).toHaveTextContent('Admin Geral')
    // role="status" => anunciado por leitor de tela quando aparece
    expect(banner).toHaveAttribute('role', 'status')
  })

  it('deixa o nome do usuário atuando e o nome original em negrito', () => {
    render(
      <ImpersonationBanner
        isImpersonating
        currentUserName='Maria Souza'
        originalUserName='Admin Geral'
        onStop={vi.fn()}
      />
    )

    const banner = screen.getByTestId('impersonation-banner')
    expect(within(banner).getByText('Maria Souza').tagName).toBe('STRONG')
    expect(within(banner).getByText('Admin Geral').tagName).toBe('STRONG')
  })

  it('chama onStop no clique do botão', async () => {
    const user = userEvent.setup()
    const onStop = vi.fn()
    render(
      <ImpersonationBanner
        isImpersonating
        currentUserName='Maria'
        originalUserName='Admin'
        onStop={onStop}
      />
    )

    await user.click(screen.getByTestId('impersonation-banner-stop'))
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('desabilita o botão e mostra "Voltando..." quando isPending', () => {
    render(
      <ImpersonationBanner
        isImpersonating
        currentUserName='Maria'
        originalUserName='Admin'
        onStop={vi.fn()}
        isPending
      />
    )

    const button = screen.getByTestId('impersonation-banner-stop')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Voltando...')
  })

  it('omite o botão quando não há onStop', () => {
    render(<ImpersonationBanner isImpersonating currentUserName='Maria' />)
    expect(
      screen.queryByTestId('impersonation-banner-stop')
    ).not.toBeInTheDocument()
  })

  // The global stand-in for `../ui/button` already renders a real <button>
  // (unlike Badge/Card's, which render a div), so axe sees valid markup
  // without unmocking.
  it('não tem violações de acessibilidade detectáveis pelo axe', async () => {
    const { container } = render(
      <ImpersonationBanner
        isImpersonating
        currentUserName='Maria Souza'
        originalUserName='Admin Geral'
        onStop={vi.fn()}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ImpersonationDialog
// ─────────────────────────────────────────────────────────────────────────────

const USERS: ImpersonationUserOption[] = [
  { id: '1', label: 'Maria Souza', description: 'maria@acme.com' },
  { id: '2', label: 'João Lima', description: 'joao@acme.com' },
]

function makeSearch(users = USERS) {
  return vi.fn(async (term: string) =>
    users.filter(u => u.label.toLowerCase().includes(term.toLowerCase()))
  )
}

/** Espera a lista inicial (debounce + promise) terminar de carregar. */
async function waitForList() {
  await waitFor(() =>
    expect(screen.queryByText('Buscando usuários...')).not.toBeInTheDocument()
  )
}

describe('ImpersonationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não renderiza conteúdo quando fechado e nem chama searchUsers', () => {
    const searchUsers = makeSearch()
    render(
      <ImpersonationDialog
        open={false}
        onOpenChange={vi.fn()}
        searchUsers={searchUsers}
        onConfirm={vi.fn()}
      />
    )
    expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument()
    expect(searchUsers).not.toHaveBeenCalled()
  })

  it('mostra o estado de carregamento e depois a lista', async () => {
    const searchUsers = makeSearch()
    render(
      <ImpersonationDialog
        open
        onOpenChange={vi.fn()}
        searchUsers={searchUsers}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('Buscando usuários...')).toBeInTheDocument()
    await waitForList()

    expect(searchUsers).toHaveBeenCalledWith('')
    expect(screen.getByText('Maria Souza')).toBeInTheDocument()
    expect(screen.getByText('João Lima')).toBeInTheDocument()
  })

  it('filtra pelo termo digitado (busca injetada, com debounce)', async () => {
    const user = userEvent.setup()
    const searchUsers = makeSearch()
    render(
      <ImpersonationDialog
        open
        onOpenChange={vi.fn()}
        searchUsers={searchUsers}
        onConfirm={vi.fn()}
        debounceMs={0}
      />
    )
    await waitForList()

    await user.type(screen.getByLabelText('Usuário'), 'maria')

    await waitFor(() => expect(searchUsers).toHaveBeenLastCalledWith('maria'))
    await waitFor(() =>
      expect(screen.queryByText('João Lima')).not.toBeInTheDocument()
    )
    expect(screen.getByText('Maria Souza')).toBeInTheDocument()
  })

  it('mostra a mensagem de vazio quando a busca não retorna nada', async () => {
    const searchUsers = vi.fn(async () => [])
    render(
      <ImpersonationDialog
        open
        onOpenChange={vi.fn()}
        searchUsers={searchUsers}
        onConfirm={vi.fn()}
      />
    )
    await waitForList()
    expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument()
  })

  it('mantém o confirmar desabilitado até haver seleção', async () => {
    const user = userEvent.setup()
    render(
      <ImpersonationDialog
        open
        onOpenChange={vi.fn()}
        searchUsers={makeSearch()}
        onConfirm={vi.fn()}
      />
    )
    await waitForList()

    const confirm = screen.getByTestId('impersonation-dialog-confirm')
    expect(confirm).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Maria Souza/ }))
    expect(confirm).toBeEnabled()
  })

  it('confirma com o id selecionado e fecha o dialog', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn(async () => ({ ok: true }))
    render(
      <ImpersonationDialog
        open
        onOpenChange={onOpenChange}
        searchUsers={makeSearch()}
        onConfirm={onConfirm}
      />
    )
    await waitForList()

    await user.click(screen.getByRole('button', { name: /João Lima/ }))
    await user.click(screen.getByTestId('impersonation-dialog-confirm'))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('2'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('exibe a mensagem devolvida por onConfirm e mantém o dialog aberto', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn(async () => ({
      ok: false,
      message: 'Usuário sem permissão para ser impersonado',
    }))
    render(
      <ImpersonationDialog
        open
        onOpenChange={onOpenChange}
        searchUsers={makeSearch()}
        onConfirm={onConfirm}
      />
    )
    await waitForList()

    await user.click(screen.getByRole('button', { name: /Maria Souza/ }))
    await user.click(screen.getByTestId('impersonation-dialog-confirm'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Usuário sem permissão para ser impersonado'
    )
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('trata rejeição de onConfirm como erro exibido', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn(async () => {
      throw new Error('boom na API')
    })
    render(
      <ImpersonationDialog
        open
        onOpenChange={vi.fn()}
        searchUsers={makeSearch()}
        onConfirm={onConfirm}
      />
    )
    await waitForList()

    await user.click(screen.getByRole('button', { name: /Maria Souza/ }))
    await user.click(screen.getByTestId('impersonation-dialog-confirm'))

    expect(await screen.findByRole('alert')).toHaveTextContent('boom na API')
  })

  it('trata rejeição de searchUsers sem quebrar a lista', async () => {
    const searchUsers = vi.fn(async () => {
      throw new Error('offline')
    })
    render(
      <ImpersonationDialog
        open
        onOpenChange={vi.fn()}
        searchUsers={searchUsers}
        onConfirm={vi.fn()}
      />
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível buscar os usuários'
    )
  })

  it('respeita option.disabled', async () => {
    render(
      <ImpersonationDialog
        open
        onOpenChange={vi.fn()}
        searchUsers={makeSearch([
          { id: '9', label: 'Bloqueado', disabled: true },
        ])}
        onConfirm={vi.fn()}
      />
    )
    await waitForList()

    const list = screen.getByRole('list')
    expect(
      within(list).getByRole('button', { name: /Bloqueado/ })
    ).toBeDisabled()
  })
})
