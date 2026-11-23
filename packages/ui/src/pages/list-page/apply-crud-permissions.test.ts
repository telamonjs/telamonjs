import { describe, expect, it } from 'vitest'
import { applyCrudPermissions } from './apply-crud-permissions'
import type { CrudConfig } from '../../types/crud'
import type { DataTableActionsConfig } from '../../types/actions'

interface Row {
  id: string
}

const dialogs: NonNullable<CrudConfig<Row>['dialogs']> = {
  create: { title: 'New' },
  edit: { title: 'Edit' },
  view: { title: 'View' },
}

function config(over: Partial<CrudConfig<Row>> = {}): CrudConfig<Row> {
  return {
    module: { name: 'rows', title: 'Rows', description: '', route: '/rows' },
    list: { title: 'Rows', description: '', columns: [] },
    form: { sections: [] },
    query: { queryKey: ['rows'], queryFn: async () => ({ data: [], total: 0, page: 1, totalPages: 0 }) },
    mutations: {},
    dialogs,
    ...over,
  }
}

describe('applyCrudPermissions', () => {
  describe('State Management', () => {
    it('without permissions returns dialogs and actionsConfig untouched (same identity)', () => {
      const actions: DataTableActionsConfig<Row> = { standard: { delete: true } }
      const out = applyCrudPermissions(config(), actions)
      expect(out.dialogs).toBe(dialogs)
      expect(out.actionsConfig).toBe(actions)
    })

    it('drops the dialogs of denied operations and keeps the granted ones', () => {
      const out = applyCrudPermissions(
        config({
          permissions: {
            can: p => p === 'rows.view',
            create: 'rows.create',
            edit: 'rows.edit',
            view: 'rows.view',
          },
        }),
        undefined
      )
      expect(out.dialogs?.create).toBeUndefined()
      expect(out.dialogs?.edit).toBeUndefined()
      expect(out.dialogs?.view).toBe(dialogs.view)
    })

    it('falls back to actionsConfig.userPermissions when there is no `can`', () => {
      const out = applyCrudPermissions(
        config({ permissions: { create: 'rows.create' } }),
        { userPermissions: ['rows.create'] }
      )
      expect(out.dialogs?.create).toBe(dialogs.create)
    })

    it('row actions inherit permissions.<op>; an own permission wins', () => {
      const out = applyCrudPermissions(
        config({
          permissions: { edit: 'rows.edit', delete: 'rows.delete', view: 'rows.view' },
        }),
        { standard: { delete: true, view: { permission: 'custom.view', label: 'See' } } }
      )
      const standard = out.actionsConfig?.standard
      // edit is injected by dialogs.edit, so it carries the permission too
      expect(standard?.edit).toEqual({ permission: 'rows.edit' })
      expect(standard?.delete).toEqual({ permission: 'rows.delete' })
      expect(standard?.view).toEqual({ permission: 'custom.view', label: 'See' })
    })

    it('passes permissions.can to actionsConfig.can unless that one is set', () => {
      const can = () => true
      const own = () => false
      expect(
        applyCrudPermissions(config({ permissions: { can } }), undefined).actionsConfig?.can
      ).toBe(can)
      expect(
        applyCrudPermissions(config({ permissions: { can } }), { can: own }).actionsConfig?.can
      ).toBe(own)
    })
  })

  describe('Edge Cases', () => {
    it('no form (read-only list): drops the create/edit dialogs, keeps view', () => {
      const out = applyCrudPermissions(config({ form: undefined }), undefined)
      expect(out.dialogs?.create).toBeUndefined()
      expect(out.dialogs?.edit).toBeUndefined()
      expect(out.dialogs?.view).toBe(dialogs.view)
    })

    it('a CrudConfig compiles without form and with a form without validation', () => {
      const readOnly: CrudConfig<Row> = { ...config(), form: undefined }
      const unvalidated: CrudConfig<Row> = { ...config(), form: { sections: [] } }
      expect(readOnly.form).toBeUndefined()
      expect(unvalidated.form?.validation).toBeUndefined()
    })

    it('never adds a row action that would not exist (no dialog, no standard entry, or false)', () => {
      const out = applyCrudPermissions(
        config({
          dialogs: undefined,
          permissions: { edit: 'rows.edit', delete: 'rows.delete', view: 'rows.view' },
        }),
        { standard: { view: false } }
      )
      expect(out.actionsConfig?.standard).toEqual({ view: false })
    })

    it('a denied view/edit drops the dialog, so no row action is injected for it', () => {
      const out = applyCrudPermissions(
        config({ permissions: { can: () => false, edit: 'rows.edit' } }),
        undefined
      )
      expect(out.dialogs?.edit).toBeUndefined()
      expect(out.actionsConfig?.standard?.edit).toBeUndefined()
    })
  })
})
