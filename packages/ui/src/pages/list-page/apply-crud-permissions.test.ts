import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

    it('checks against the actionsConfig it is given (not only config.actionsConfig)', () => {
      const out = applyCrudPermissions(
        config({ permissions: { create: 'rows.create', view: 'rows.view' } }),
        { userPermissions: ['rows.view'] }
      )
      expect(out.dialogs?.create).toBeUndefined()
      expect(out.dialogs?.view).toBe(dialogs.view)
    })
  })

  describe('Misconfiguration (permissions declared, no way to check them)', () => {
    let warn: ReturnType<typeof vi.spyOn>
    beforeEach(() => {
      warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })
    afterEach(() => {
      warn.mockRestore()
      vi.unstubAllEnvs()
    })

    it('stays fail-open by default (no behaviour change) and warns once per config in development', () => {
      const cfg = config({ permissions: { create: 'rows.create', delete: 'rows.delete' } })
      const out = applyCrudPermissions(cfg, { standard: { delete: true } })
      applyCrudPermissions(cfg, { standard: { delete: true } })

      expect(out.dialogs?.create).toBe(dialogs.create)
      expect(out.actionsConfig?.can).toBeUndefined()
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toMatch(/rows.*permissions\.can.*userPermissions.*failClosed/s)

      // another config warns on its own
      applyCrudPermissions(config({ permissions: { view: 'rows.view' } }), undefined)
      expect(warn).toHaveBeenCalledTimes(2)
    })

    it('does not warn in production', () => {
      vi.stubEnv('NODE_ENV', 'production')
      applyCrudPermissions(config({ permissions: { create: 'rows.create' } }), undefined)
      expect(warn).not.toHaveBeenCalled()
    })

    it('does not warn when a checker exists, nothing is declared, or failClosed was chosen', () => {
      applyCrudPermissions(config({ permissions: { create: 'rows.create', can: () => true } }), undefined)
      applyCrudPermissions(config({ permissions: { create: 'rows.create' } }), { userPermissions: [] })
      applyCrudPermissions(config({ permissions: { create: 'rows.create' } }), { can: () => true })
      applyCrudPermissions(config({ permissions: {} }), undefined)
      applyCrudPermissions(config({ permissions: { create: 'rows.create', failClosed: true } }), undefined)
      expect(warn).not.toHaveBeenCalled()
    })

    it('failClosed: denies every declared operation and every row/custom action permission', () => {
      const out = applyCrudPermissions(
        config({ permissions: { failClosed: true, create: 'rows.create', delete: 'rows.delete' } }),
        { standard: { delete: true } }
      )
      expect(out.dialogs?.create).toBeUndefined()
      // undeclared operations stay allowed
      expect(out.dialogs?.edit).toBe(dialogs.edit)
      expect(out.dialogs?.view).toBe(dialogs.view)
      expect(out.actionsConfig?.standard?.delete).toEqual({ permission: 'rows.delete' })
      // the row surfaces check `permission` through this denying checker
      expect(out.actionsConfig?.can?.('rows.delete')).toBe(false)
    })

    it('failClosed with a checker behaves as without it', () => {
      const out = applyCrudPermissions(
        config({ permissions: { failClosed: true, create: 'rows.create' } }),
        { userPermissions: ['rows.create'] }
      )
      expect(out.dialogs?.create).toBe(dialogs.create)
      expect(out.actionsConfig?.can).toBeUndefined()
    })
  })
})
