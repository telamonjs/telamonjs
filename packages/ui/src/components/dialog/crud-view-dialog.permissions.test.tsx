import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { CrudViewDialog } from './crud-view-dialog'
import type { CrudViewDialogProps } from './crud-view-dialog'

const portalSpy = vi.fn()
vi.mock('./view-portal-dialog', () => ({
  ViewPortalDialog: (props: Record<string, unknown>) => {
    portalSpy(props)
    return null
  },
}))

type Row = { id: string }
const onSaveSection = vi.fn()

function renderPortal(
  extra: Partial<CrudViewDialogProps<Row>['config']> = {}
) {
  render(
    <CrudViewDialog<Row>
      config={{
        dialogs: {
          view: { title: 'Record', portal: { sections: () => [], onSaveSection } },
        },
        mutations: { getForView: vi.fn() },
        ...extra,
      }}
      id='1'
      open
      onOpenChange={vi.fn()}
    />
  )
}

const saveProp = () => portalSpy.mock.calls.at(-1)?.[0].onSaveSection

describe('CrudViewDialog - portal section saving follows permissions.edit', () => {
  beforeEach(() => portalSpy.mockClear())

  it('without permissions keeps onSaveSection', async () => {
    renderPortal()
    await waitFor(() => expect(portalSpy).toHaveBeenCalled())
    expect(saveProp()).toBe(onSaveSection)
  })

  it('denied edit drops onSaveSection (sections become read-only)', async () => {
    renderPortal({ permissions: { edit: 'rows.edit', can: () => false } })
    await waitFor(() => expect(portalSpy).toHaveBeenCalled())
    expect(saveProp()).toBeUndefined()
  })

  it('granted through actionsConfig.userPermissions keeps it', async () => {
    renderPortal({
      permissions: { edit: 'rows.edit' },
      actionsConfig: { userPermissions: ['rows.edit'] },
    })
    await waitFor(() => expect(portalSpy).toHaveBeenCalled())
    expect(saveProp()).toBe(onSaveSection)
  })
})
