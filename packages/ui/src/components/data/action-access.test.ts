import { describe, expect, it } from 'vitest'
import {
  actionEnabled,
  actionGranted,
  actionVisible,
  crudGranted,
} from './action-access'

describe('action-access', () => {
  it('actionGranted: no permission or no userPermissions = allowed; any of the listed permissions', () => {
    expect(actionGranted(undefined, ['a'])).toBe(true)
    expect(actionGranted('a', undefined)).toBe(true)
    expect(actionGranted('a', ['a'])).toBe(true)
    expect(actionGranted('a', ['b'])).toBe(false)
    expect(actionGranted(['a', 'b'], new Set(['b']))).toBe(true)
    expect(actionGranted(['a', 'b'], [])).toBe(false)
  })

  it('actionGranted: `can` decides instead of the exact lookup (bypass with empty permissions)', () => {
    const superadmin = () => true
    expect(actionGranted('a', [], superadmin)).toBe(true)
    expect(actionGranted(['a', 'b'], ['a'], perm => perm === 'b')).toBe(true)
    expect(actionGranted('a', ['a'], () => false)).toBe(false)
    expect(actionGranted(undefined, [], () => false)).toBe(true)
  })

  it('crudGranted: permissions.<op> against permissions.can, actionsConfig.can or userPermissions', () => {
    expect(crudGranted({}, 'create')).toBe(true)
    expect(crudGranted({ permissions: { create: 'x.create' } }, 'create')).toBe(true)
    expect(
      crudGranted(
        { permissions: { create: 'x.create' }, actionsConfig: { userPermissions: [] } },
        'create'
      )
    ).toBe(false)
    expect(
      crudGranted(
        { permissions: { edit: 'x.edit', can: p => p === 'x.edit' }, actionsConfig: false },
        'edit'
      )
    ).toBe(true)
    // actionsConfig.can wins over permissions.can
    expect(
      crudGranted(
        {
          permissions: { delete: 'x.delete', can: () => true },
          actionsConfig: { can: () => false },
        },
        'delete'
      )
    ).toBe(false)
  })

  it('crudGranted: permissions.failClosed denies a declared operation only when there is no checker', () => {
    const failClosed = { create: 'x.create', failClosed: true }
    expect(crudGranted({ permissions: failClosed }, 'create')).toBe(false)
    // an operation without a permission stays allowed
    expect(crudGranted({ permissions: failClosed }, 'edit')).toBe(true)
    // with a checker, failClosed changes nothing
    expect(
      crudGranted({ permissions: failClosed, actionsConfig: { userPermissions: ['x.create'] } }, 'create')
    ).toBe(true)
    expect(crudGranted({ permissions: { ...failClosed, can: () => true } }, 'create')).toBe(true)
  })

  it('fallback checker (PermissionsProvider): used only when the config has neither `can` nor userPermissions', () => {
    const deny = () => false
    expect(actionGranted('a', undefined, undefined, deny)).toBe(false)
    expect(actionGranted(undefined, undefined, undefined, deny)).toBe(true)
    // the config wins: its `can`, or its userPermissions
    expect(actionGranted('a', undefined, () => true, deny)).toBe(true)
    expect(actionGranted('a', ['a'], undefined, deny)).toBe(true)

    expect(crudGranted({ permissions: { create: 'x' } }, 'create', deny)).toBe(false)
    expect(crudGranted({ permissions: { create: 'x', can: () => true } }, 'create', deny)).toBe(true)
    expect(crudGranted({ permissions: { create: 'x' }, actionsConfig: { can: () => true } }, 'create', deny)).toBe(true)
    expect(
      crudGranted({ permissions: { create: 'x' }, actionsConfig: { userPermissions: ['x'] } }, 'create', deny)
    ).toBe(true)
    // a fallback is a checker: failClosed does not deny
    expect(crudGranted({ permissions: { create: 'x', failClosed: true } }, 'create', () => true)).toBe(true)
  })

  it('actionVisible / actionEnabled: undefined = true; boolean; function of the row', () => {
    const row = { ativo: false }
    expect(actionVisible({}, row)).toBe(true)
    expect(actionVisible({ visible: false }, row)).toBe(false)
    expect(actionVisible({ visible: (r: typeof row) => r.ativo }, row)).toBe(false)
    expect(actionEnabled({}, row)).toBe(true)
    expect(actionEnabled({ enabled: true }, row)).toBe(true)
    expect(actionEnabled({ enabled: (r: typeof row) => !r.ativo }, row)).toBe(true)
  })
})
