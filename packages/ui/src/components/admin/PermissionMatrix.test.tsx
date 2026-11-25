/**
 * PermissionMatrix against the REAL Checkbox, Input and Badge primitives.
 */

import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import * as axeMatchers from 'vitest-axe/matchers'

import { msg } from '../../i18n/msg'
import { PermissionMatrix } from './PermissionMatrix'
import type { PermissionMatrixPermission, PermissionMatrixProps, PermissionMatrixRole } from './PermissionMatrix'

expect.extend(axeMatchers)

vi.unmock('../../ui/checkbox')
vi.unmock('../../ui/input')
vi.unmock('../../ui/badge')

const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }))

const roles: PermissionMatrixRole[] = [
  { id: 'admin', label: 'Admin', system: true },
  { id: 'editor', label: 'Editor' },
  { id: 'viewer', label: 'Viewer' },
]

const permissions: PermissionMatrixPermission[] = [
  { id: 'p1', code: 'posts.read', label: 'Read posts', group: 'posts', description: 'List and open posts' },
  { id: 'p2', code: 'posts.write', group: 'posts' },
  { id: 'p3', code: 'users.read', group: 'users' },
]

/** Controlled harness: granted lives in state, onToggle updates it (sync by default). */
function Harness(props: Partial<PermissionMatrixProps> & { initial?: string[] }) {
  const [set, setSet] = useState(new Set(props.initial ?? ['admin:p1', 'admin:p2', 'admin:p3', 'editor:p1']))
  return (
    <PermissionMatrix
      roles={roles}
      permissions={permissions}
      granted={(r, p) => set.has(`${r}:${p}`)}
      onToggle={(r, p, next) => {
        setSet(prev => {
          const s = new Set(prev)
          if (next) s.add(`${r}:${p}`)
          else s.delete(`${r}:${p}`)
          return s
        })
      }}
      {...props}
    />
  )
}

const cell = (permission: string, role: string) =>
  screen.getByRole('checkbox', { name: `${permission} para ${role}` })

describe('PermissionMatrix', () => {
  describe('Rendering', () => {
    it('renders roles as column headers and permissions grouped by group as rows', () => {
      render(<Harness />)
      const table = screen.getByRole('table', { name: 'Matriz de permissões' })
      const cols = within(table).getAllByRole('columnheader').map(h => h.textContent)
      expect(cols).toEqual(['Permissão', expect.stringContaining('Admin'), 'Editor', 'Viewer'])
      expect(within(table).getByRole('rowheader', { name: 'posts' })).toBeInTheDocument()
      expect(within(table).getByRole('rowheader', { name: 'users' })).toBeInTheDocument()
      expect(screen.getByText('Read posts')).toBeInTheDocument()
      expect(screen.getByText('posts.read')).toBeInTheDocument()
      expect(screen.getByText('List and open posts')).toBeInTheDocument()
    })

    it('reflects granted in each cell and badges system roles', () => {
      render(<Harness />)
      expect(cell('Read posts', 'Editor')).toBeChecked()
      expect(cell('posts.write', 'Editor')).not.toBeChecked()
      expect(screen.getByText('Sistema')).toBeInTheDocument()
    })

    it('shows a per-permission badge next to its name', () => {
      render(
        <Harness
          permissions={[{ id: 'p1', code: 'posts.read', label: 'Read posts', group: 'posts', badge: 'Read' }]}
        />
      )
      expect(screen.getByText('Read')).toBeInTheDocument()
    })

    it('resolves I18nText labels (roles, permissions, group labels)', () => {
      render(
        <PermissionMatrix
          roles={[{ id: 'r', label: msg('telamonjs.common.edit') }]}
          permissions={[{ id: 'p', code: 'x.y', label: msg('telamonjs.common.view'), group: 'g' }]}
          groupLabels={{ g: msg('telamonjs.common.details') }}
          granted={() => false}
        />
      )
      expect(screen.getByRole('columnheader', { name: 'Editar' })).toBeInTheDocument()
      expect(screen.getByRole('rowheader', { name: 'Detalhes' })).toBeInTheDocument()
      expect(cell('Visualizar', 'Editar')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('toggles a cell through onToggle with the next value', async () => {
      const onToggle = vi.fn()
      render(<Harness onToggle={onToggle} />)
      await userEvent.click(cell('posts.write', 'Editor'))
      expect(onToggle).toHaveBeenCalledWith('editor', 'p2', true)
      await userEvent.click(cell('Read posts', 'Editor'))
      expect(onToggle).toHaveBeenCalledWith('editor', 'p1', false)
    })

    it('is keyboard operable (Tab to a cell, Space toggles)', async () => {
      render(<Harness />)
      const box = cell('posts.write', 'Viewer')
      box.focus()
      await userEvent.keyboard(' ')
      await waitFor(() => expect(cell('posts.write', 'Viewer')).toBeChecked())
    })

    it('selects every permission of a group for a role, then clears it', async () => {
      const onToggle = vi.fn()
      render(<Harness onToggle={onToggle} />)
      const group = screen.getByRole('checkbox', { name: 'Todas as permissões de posts para Editor' })
      expect(group).toHaveAttribute('aria-checked', 'mixed')
      await userEvent.click(group)
      // only the cell that differs is toggled
      expect(onToggle.mock.calls).toEqual([['editor', 'p2', true]])
    })

    it('a fully granted group unchecks every cell of it', async () => {
      render(<Harness initial={['viewer:p1', 'viewer:p2']} />)
      const group = screen.getByRole('checkbox', { name: 'Todas as permissões de posts para Viewer' })
      expect(group).toBeChecked()
      await userEvent.click(group)
      await waitFor(() => expect(cell('Read posts', 'Viewer')).not.toBeChecked())
      expect(cell('posts.write', 'Viewer')).not.toBeChecked()
    })

    it('filters permissions by code, label, description or group', async () => {
      render(<Harness />)
      const search = screen.getByRole('searchbox', { name: 'Buscar permissão' })
      await userEvent.type(search, 'open posts')
      expect(screen.getByText('Read posts')).toBeInTheDocument()
      expect(screen.queryByText('posts.write')).not.toBeInTheDocument()
      expect(screen.queryByRole('rowheader', { name: 'users' })).not.toBeInTheDocument()
      await userEvent.clear(search)
      await userEvent.type(search, 'USERS')
      expect(screen.getByText('users.read')).toBeInTheDocument()
      expect(screen.queryByText('Read posts')).not.toBeInTheDocument()
    })

    it('group select-all only touches the permissions left by the search', async () => {
      const onToggle = vi.fn()
      render(<Harness onToggle={onToggle} initial={[]} />)
      await userEvent.type(screen.getByRole('searchbox'), 'write')
      await userEvent.click(screen.getByRole('checkbox', { name: 'Todas as permissões de posts para Viewer' }))
      expect(onToggle.mock.calls).toEqual([['viewer', 'p2', true]])
    })
  })

  describe('State Management', () => {
    it('async onToggle: optimistic value and a busy, disabled cell until it resolves', async () => {
      let resolve!: () => void
      const onToggle = vi.fn(() => new Promise<void>(r => (resolve = r)))
      render(<Harness onToggle={onToggle} />)
      await userEvent.click(cell('posts.write', 'Editor'))
      const box = cell('posts.write', 'Editor')
      expect(box).toBeChecked()
      expect(box).toBeDisabled()
      expect(box.closest('td')).toHaveAttribute('aria-busy', 'true')
      resolve()
      await waitFor(() => expect(cell('posts.write', 'Editor')).toBeEnabled())
    })

    it('async onToggle rejecting: rolls back and toasts the error message', async () => {
      const onToggle = vi.fn(() => Promise.reject(new Error('Forbidden')))
      render(<Harness onToggle={onToggle} />)
      await userEvent.click(cell('posts.write', 'Editor'))
      await waitFor(() => expect(toastError).toHaveBeenCalledWith('Forbidden'))
      expect(cell('posts.write', 'Editor')).not.toBeChecked()
      expect(cell('posts.write', 'Editor')).toBeEnabled()
    })

    it('falls back to the localized error when the rejection has no message', async () => {
      render(<Harness onToggle={() => Promise.reject(new Error(''))} />)
      await userEvent.click(cell('posts.write', 'Editor'))
      await waitFor(() => expect(toastError).toHaveBeenCalledWith('Não foi possível atualizar a permissão.'))
    })

    it('a failing group toggle toasts once', async () => {
      render(<Harness initial={[]} onToggle={() => Promise.reject(new Error('Nope'))} />)
      await userEvent.click(screen.getByRole('checkbox', { name: 'Todas as permissões de posts para Viewer' }))
      await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    })
  })

  describe('Edge Cases', () => {
    it('system roles are read-only by default', () => {
      render(<Harness />)
      expect(cell('Read posts', 'Admin')).toBeDisabled()
      expect(screen.getByRole('checkbox', { name: 'Todas as permissões de posts para Admin' })).toBeDisabled()
      expect(cell('Read posts', 'Editor')).toBeEnabled()
    })

    it('readOnly as a function decides per role (overrides the system default)', () => {
      render(<Harness readOnly={roleId => roleId === 'viewer'} />)
      expect(cell('Read posts', 'Admin')).toBeEnabled()
      expect(cell('Read posts', 'Viewer')).toBeDisabled()
    })

    it('readOnly={true} or no onToggle disables every cell', () => {
      const { unmount } = render(<Harness readOnly />)
      expect(screen.getAllByRole('checkbox').every(b => (b as HTMLButtonElement).disabled)).toBe(true)
      unmount()
      render(<PermissionMatrix roles={roles} permissions={permissions} granted={() => true} />)
      expect(screen.getAllByRole('checkbox').every(b => (b as HTMLButtonElement).disabled)).toBe(true)
    })

    it('shows the empty message when nothing matches', async () => {
      render(<Harness />)
      await userEvent.type(screen.getByRole('searchbox'), 'zzz')
      expect(screen.getByText('Nenhuma permissão encontrada.')).toBeInTheDocument()
    })

    it('hides the search and the group checkboxes when asked', () => {
      render(<Harness searchable={false} selectAllInGroup={false} />)
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: /Todas as permissões/ })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has no axe violations', async () => {
      const { container } = render(<Harness />)
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
