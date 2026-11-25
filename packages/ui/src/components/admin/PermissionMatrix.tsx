'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'
import { Badge } from '../../ui/badge'
import { Checkbox } from '../../ui/checkbox'
import { Input } from '../../ui/input'
import { cn } from '../../utils'
import { getErrorMessage } from '../../utils/error-message'
import { wasToasted } from '../../utils/toasted-error'

export interface PermissionMatrixRole {
  id: string
  label: I18nText
  /** System roles are read-only unless `readOnly` is a function that says otherwise. */
  system?: boolean
}

export interface PermissionMatrixPermission {
  id: string
  /** Machine code (`posts.write`); shown in mono and searched. */
  code: string
  /** Human name; the code is used when absent. */
  label?: I18nText
  /** Rows are grouped by this value (category, module), in order of first appearance. */
  group: string
  description?: I18nText
}

export interface PermissionMatrixProps {
  /** Columns. */
  roles: readonly PermissionMatrixRole[]
  /** Rows, grouped by `group`. */
  permissions: readonly PermissionMatrixPermission[]
  /**
   * Whether `roleId` holds `permissionId`. A function, so any storage shape
   * works (`role.permissionIds`, a Map of Sets, a bypass role that holds everything)
   * without encoding composite keys.
   */
  granted: (roleId: string, permissionId: string) => boolean
  /**
   * Called per changed cell (a group "select all" calls it once per cell that differs).
   * Returning a promise shows the cell optimistically and busy until it settles;
   * a rejection rolls it back and toasts the error. Resolve after `granted`
   * reflects the change (await the refetch), or the cell flickers back.
   * Without it the matrix is read-only.
   */
  onToggle?: (roleId: string, permissionId: string, next: boolean) => void | Promise<unknown>
  /**
   * `true` locks every cell; a function decides per role and replaces the
   * default, which locks roles flagged `system`.
   */
  readOnly?: boolean | ((roleId: string) => boolean)
  /** Display names for `group` values. Default: the raw group. */
  groupLabels?: Readonly<Record<string, I18nText>>
  /** Per-group, per-role "select all" checkbox. Default `true`. */
  selectAllInGroup?: boolean
  /** Search box filtering permissions by code, label, description and group. Default `true`. */
  searchable?: boolean
  /** Classes of the scroll container (default height `min(70vh, 720px)`). */
  className?: string
}

const cellKey = (roleId: string, permissionId: string) => `${roleId}\u0000${permissionId}`

/**
 * PermissionMatrix - roles × permissions grid of checkboxes, grouped by permission group.
 *
 * Pure UI: the app loads roles/permissions and persists toggles. Roles are columns,
 * permissions rows under their group; header row and first column stay sticky.
 *
 * @example
 * ```tsx
 * <PermissionMatrix
 *   roles={data.roles}
 *   permissions={data.permissions}
 *   granted={(roleId, permId) => byRole.get(roleId)?.has(permId) ?? false}
 *   onToggle={(roleId, permId, next) => toggle.mutateAsync({ roleId, permId, next })}
 * />
 * ```
 */
export function PermissionMatrix({
  roles,
  permissions,
  granted,
  onToggle,
  readOnly,
  groupLabels,
  selectAllInGroup = true,
  searchable = true,
  className,
}: PermissionMatrixProps) {
  const t = useTelamonjsT()
  const text = useText()
  const [search, setSearch] = useState('')
  // Optimistic values of cells whose async onToggle is in flight.
  const [pending, setPending] = useState<ReadonlyMap<string, boolean>>(new Map())

  const groupName = (group: string) => text(groupLabels?.[group]) ?? group
  const permName = (p: PermissionMatrixPermission) => text(p.label) ?? p.code

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const byGroup = new Map<string, PermissionMatrixPermission[]>()
    for (const p of permissions) {
      const haystack = [p.code, text(p.label), text(p.description), p.group, text(groupLabels?.[p.group])]
      if (q && !haystack.some(s => s?.toLowerCase().includes(q))) continue
      byGroup.set(p.group, [...(byGroup.get(p.group) ?? []), p])
    }
    return [...byGroup]
  }, [permissions, search, text, groupLabels])

  const isLocked = (role: PermissionMatrixRole) =>
    !onToggle ||
    readOnly === true ||
    (typeof readOnly === 'function' ? readOnly(role.id) : role.system === true)
  const value = (roleId: string, permissionId: string) =>
    pending.get(cellKey(roleId, permissionId)) ?? granted(roleId, permissionId)

  const run = async (roleId: string, ids: readonly string[], next: boolean) => {
    if (!onToggle || ids.length === 0) return
    const keys = ids.map(id => cellKey(roleId, id))
    const update = (fn: (m: Map<string, boolean>, k: string) => void) =>
      setPending(prev => {
        const m = new Map(prev)
        keys.forEach(k => fn(m, k))
        return m
      })
    update((m, k) => m.set(k, next))
    try {
      await Promise.all(ids.map(id => onToggle(roleId, id, next)))
    } catch (err) {
      if (!wasToasted(err)) toast.error(getErrorMessage(err) ?? t('admin.permissionMatrix.toggleError'))
    } finally {
      update((m, k) => m.delete(k))
    }
  }

  const sticky = 'sticky left-0 bg-background'

  return (
    <div className='space-y-3'>
      {searchable && (
        <Input
          type='search'
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.permissionMatrix.search')}
          aria-label={t('admin.permissionMatrix.searchLabel')}
          className='h-9 max-w-xs'
        />
      )}
      <div className={cn('max-h-[min(70vh,720px)] overflow-auto rounded-lg border', className)}>
        <table className='w-full border-separate border-spacing-0 text-sm'>
          <caption className='sr-only'>{t('admin.permissionMatrix.caption')}</caption>
          <thead>
            <tr>
              <th scope='col' className={cn(sticky, 'top-0 z-30 border-b px-3 py-2 text-left font-medium')}>
                {t('admin.permissionMatrix.permission')}
              </th>
              {roles.map(role => (
                <th
                  key={role.id}
                  scope='col'
                  className='sticky top-0 z-20 min-w-24 border-b bg-background px-3 py-2 text-center font-medium'
                >
                  <span className='flex flex-col items-center gap-1'>
                    {text(role.label)}
                    {role.system && <Badge variant='secondary'>{t('admin.permissionMatrix.system')}</Badge>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {groups.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={roles.length + 1} className='px-3 py-6 text-center text-muted-foreground'>
                  {t('admin.permissionMatrix.noResults')}
                </td>
              </tr>
            </tbody>
          )}
          {groups.map(([group, perms]) => (
            <tbody key={group}>
              <tr className='bg-muted'>
                <th
                  scope='rowgroup'
                  className='sticky left-0 z-10 border-b bg-muted px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'
                >
                  {groupName(group)}
                </th>
                {roles.map(role => {
                  if (!selectAllInGroup) return <td key={role.id} className='border-b' />
                  const ids = perms.map(p => p.id)
                  const on = ids.filter(id => value(role.id, id)).length
                  return (
                    <td key={role.id} className='border-b px-3 py-1.5 text-center'>
                      <Checkbox
                        checked={on === ids.length ? true : on === 0 ? false : 'indeterminate'}
                        disabled={isLocked(role) || ids.some(id => pending.has(cellKey(role.id, id)))}
                        onCheckedChange={() => {
                          const next = on !== ids.length
                          void run(role.id, ids.filter(id => value(role.id, id) !== next), next)
                        }}
                        aria-label={t('admin.permissionMatrix.groupLabel', {
                          group: groupName(group),
                          role: text(role.label) ?? role.id,
                        })}
                      />
                    </td>
                  )
                })}
              </tr>
              {perms.map(p => (
                <tr key={p.id}>
                  <th scope='row' className={cn(sticky, 'z-10 border-b px-3 py-1.5 text-left font-normal')}>
                    {p.label !== undefined && <span className='block'>{text(p.label)}</span>}
                    <code className='text-xs text-muted-foreground'>{p.code}</code>
                    {p.description !== undefined && (
                      <span className='block text-xs text-muted-foreground'>{text(p.description)}</span>
                    )}
                  </th>
                  {roles.map(role => {
                    const busy = pending.has(cellKey(role.id, p.id))
                    return (
                      <td
                        key={role.id}
                        aria-busy={busy || undefined}
                        className={cn('border-b px-3 py-1.5 text-center', busy && 'opacity-60')}
                      >
                        <Checkbox
                          checked={value(role.id, p.id)}
                          disabled={isLocked(role) || busy}
                          onCheckedChange={next => void run(role.id, [p.id], next === true)}
                          aria-label={t('admin.permissionMatrix.cellLabel', {
                            permission: permName(p),
                            role: text(role.label) ?? role.id,
                          })}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}
