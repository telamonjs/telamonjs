'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PermissionMatrix, QueryErrorState } from '@telamonjs/ui'
import { rolesApi } from '@/lib/api/roles-client'
import { can } from '@/lib/permissions'
import { useSession } from '@/hooks/use-session'

/**
 * Roles × permissions: roles as columns, permissions grouped by category.
 * Each cell grants/revokes one permission; built-in roles stay locked, and
 * without `roles.write` the whole matrix is read-only.
 */
export function RolesMatrix() {
  const qc = useQueryClient()
  const { user } = useSession()
  const { data, error, refetch } = useQuery({ queryKey: ['papeis-matrix'], queryFn: rolesApi.matrix })
  const toggle = useMutation({
    mutationFn: (v: { roleId: string; permissionId: string; next: boolean }) =>
      v.next ? rolesApi.grant(v.roleId, v.permissionId) : rolesApi.revoke(v.roleId, v.permissionId),
  })

  if (error) return <QueryErrorState error={error} onRetry={refetch} />
  if (!data) return null

  const byRole = new Map(data.roles.map((r) => [r.id, new Set(r.permissionIds)]))
  return (
    <PermissionMatrix
      roles={data.roles.map((r) => ({ id: r.id, label: r.name, system: r.system }))}
      permissions={data.permissions.map((p) => ({
        id: p.id,
        code: p.code,
        group: p.category ?? p.module,
        description: p.description ?? undefined,
      }))}
      granted={(roleId, permissionId) => byRole.get(roleId)?.has(permissionId) ?? false}
      onToggle={
        can(user, 'roles.write')
          ? async (roleId, permissionId, next) => {
              await toggle.mutateAsync({ roleId, permissionId, next })
              await Promise.all([
                qc.invalidateQueries({ queryKey: ['papeis-matrix'] }),
                qc.invalidateQueries({ queryKey: ['papeis'] }),
              ])
            }
          : undefined
      }
    />
  )
}
