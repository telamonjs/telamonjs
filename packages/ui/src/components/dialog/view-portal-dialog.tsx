'use client'

import { useState, useCallback } from 'react'
import { z } from 'zod'
import { Pencil } from 'lucide-react'

import { useTelamonjsT, useText } from '../../i18n/use-t'
import { ViewDialog } from './view-dialog'
import type { ViewDialogProps } from './view-dialog'
import { ContentPortal } from '../../layouts/content-portal'
import type { PortalItem } from '../../layouts/content-portal'
import { EditForm } from '../forms/EditForm'
import type { FormField, FormActionResult } from '../forms/AdminForm'
import { pickSectionValidation } from '../../utils/form-validation'
import {
  useUnsavedChangesGuard,
  type UseUnsavedChangesGuardReturn,
} from '../../hooks/useUnsavedChangesGuard'
import { useRecordRefresh } from '../../contexts/RecordRefreshContext'
import { Button } from '../../ui/button'

/** Config that turns a `ViewPortalSection` editable inline. */
export interface PortalSectionEdit {
  fields: FormField[] | FormField[][]
  grid?: string
  validation?: z.ZodType
}

export type ViewPortalSection = PortalItem & { edit?: PortalSectionEdit }

/**
 * Persists one section. `ctx` carries the record id (the dialog's `id`, else `item.id`)
 * and the fetched record — no need to close over the selected id.
 */
export type SaveSectionFn<T> = (
  values: Record<string, unknown>,
  section: ViewPortalSection,
  ctx: { id: string; item: T }
) => Promise<FormActionResult>

export interface ViewPortalDialogProps<T extends Record<string, unknown>>
  extends Omit<
    ViewDialogProps<T>,
    | 'renderContent'
    | 'onEdit'
    | 'onDelete'
    | 'deleteConfirmation'
    | 'deleteLabel'
    | 'deleteIcon'
  > {
  /** Derives the portal sections from the fetched record. */
  sections: (data: T) => ViewPortalSection[]
  /** Section opened by default (skips the grid launcher). */
  defaultSection?: string
  /** Max grid columns at wide breakpoints — see `ContentPortalProps.columns`. */
  columns?: number
  /**
   * Monolithic (whole-entity) Zod schema. When a section has no explicit
   * `edit.validation`, a partial schema is derived from this via
   * `pickSectionValidation` (only the section's own field names).
   */
  validation?: z.ZodType
  /** Persists one section's edited values. Called with ONLY that section's field names. */
  onSaveSection?: SaveSectionFn<T>
}

function flattenFields(fields: FormField[] | FormField[][]): FormField[] {
  return Array.isArray(fields[0])
    ? (fields as FormField[][]).flat()
    : (fields as FormField[])
}

interface PortalSectionPanelProps<T extends Record<string, unknown>> {
  section: ViewPortalSection
  data: T
  recordId: string
  isEditing: boolean
  guard: UseUnsavedChangesGuardReturn
  monolithicValidation?: z.ZodType
  onSaveSection?: SaveSectionFn<T>
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaved: () => void
}

/** Renders one section: read view (+ optional pencil), or its edit form. */
function PortalSectionPanel<T extends Record<string, unknown>>({
  section,
  data,
  recordId,
  isEditing,
  guard,
  monolithicValidation,
  onSaveSection,
  onStartEdit,
  onCancelEdit,
  onSaved,
}: PortalSectionPanelProps<T>) {
  const t = useTelamonjsT()
  const text = useText()
  const canEdit = Boolean(section.edit && onSaveSection)

  if (isEditing && section.edit) {
    const edit = section.edit
    const sectionFields = flattenFields(edit.fields)
    const fieldNames = new Set(sectionFields.map(f => f.name))
    const sectionValidation =
      edit.validation ??
      pickSectionValidation(monolithicValidation, edit.fields)

    const handleSubmitValues = async (
      values: Record<string, unknown>
    ): Promise<FormActionResult<T> | void> => {
      if (!onSaveSection) return

      // Filter to ONLY this section's field names — RHF's submitted values
      // carry every key from `data` (the whole record was seeded as
      // defaultValues), so without this the "section save" would silently
      // become a full-record save.
      const filtered: Record<string, unknown> = {}
      for (const name of fieldNames) {
        if (name in values) filtered[name] = values[name]
      }

      const result = await onSaveSection(filtered, section, {
        id: recordId,
        item: data,
      })
      if (result.success) {
        onSaved()
      }
      return result as FormActionResult<T>
    }

    return (
      // flush + h-full: o form ocupa o painel inteiro — campos rolam DENTRO
      // do form (respiro px-6 interno) e o footer fica pregado no fundo,
      // sangrando de borda a borda. No mobile (painel sem altura fixa) o
      // h-full degrada para fluxo normal.
      <div className='md:h-full'>
        <EditForm<T>
          id={recordId}
          data={data}
          sections={[
            { label: section.label, fields: edit.fields, grid: edit.grid },
          ]}
          useTabs={false}
          flush
          validation={sectionValidation}
          submitText={t('dialog.saveSection')}
          cancelAction={onCancelEdit}
          onSubmitValues={handleSubmitValues}
          onDirtyChange={guard.setDirty}
        />
      </div>
    )
  }

  return (
    // md:h-full: content that declares h-full (e.g. embedded ListPage)
    // fills the panel; no padding — full-bleed, breathing room is the content's
    <div className='relative md:h-full'>
      {canEdit && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='absolute right-0 top-0'
          onClick={onStartEdit}
          aria-label={t('dialog.editSectionAria', {
            section: text(section.label) ?? '',
          })}
          data-testid={`content-portal-edit-${section.value}`}
        >
          <Pencil className='h-4 w-4' />
        </Button>
      )}
      {section.content}
    </div>
  )
}

interface PortalBodyProps<T extends Record<string, unknown>> {
  data: T
  sections: ViewPortalSection[]
  recordId: string
  defaultSection?: string
  columns?: number
  monolithicValidation?: z.ZodType
  onSaveSection?: SaveSectionFn<T>
  guard: UseUnsavedChangesGuardReturn
}

function PortalBody<T extends Record<string, unknown>>({
  data,
  sections,
  recordId,
  defaultSection,
  columns,
  monolithicValidation,
  onSaveSection,
  guard,
}: PortalBodyProps<T>) {
  const [active, setActive] = useState<string | null>(defaultSection ?? null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const refreshRecord = useRecordRefresh()

  // Every section/grid switch is routed through the guard: it's a no-op
  // when clean, and confirms discard when the active edit form is dirty.
  const handleActiveChange = useCallback(
    (next: string | null) => {
      guard.guard(() => {
        setEditingSection(null)
        setActive(next)
      })
    },
    [guard]
  )

  const tabs: PortalItem[] = sections.map(section => ({
    ...section,
    // The inline EditForm is flush with its footer pinned to the bottom:
    // drop the panel padding while this section is being edited.
    padded: editingSection === section.value ? false : section.padded,
    content: (
      <PortalSectionPanel<T>
        section={section}
        data={data}
        recordId={recordId}
        isEditing={editingSection === section.value}
        guard={guard}
        monolithicValidation={monolithicValidation}
        onSaveSection={onSaveSection}
        onStartEdit={() => setEditingSection(section.value)}
        onCancelEdit={() => guard.guard(() => setEditingSection(null))}
        onSaved={() => {
          refreshRecord?.()
          // Clears the dirty flag BEFORE AdminForm's own post-submit success
          // cascade runs: with no onSuccess prop, EditForm's `cancelAction`
          // (onCancelEdit → guard.guard(...)) fires right after this
          // callback returns. Without the reset, the guard still sees the
          // pre-save dirty state and pops a spurious "Descartar alterações?"
          // immediately after a successful save.
          guard.reset()
          setEditingSection(null)
        }}
      />
    ),
  }))

  return (
    <ContentPortal
      tabs={tabs}
      value={active}
      onValueChange={handleActiveChange}
      columns={columns}
      fill
      // No root padding: the rail's breathing room comes from the nav's p-1 +
      // button padding; the right border belongs to the panel (full-bleed form)
    />
  )
}

/**
 * ViewPortalDialog - ViewDialog with section navigation via ContentPortal
 * (grid launcher → sticky rail), plus optional inline per-section editing.
 *
 * Prefer over a plain `ViewDialog` + `ContentTabs` combo once a record has
 * 6+ sections — the tab strip becomes a poor discovery UX at that count.
 *
 * @example
 * ```tsx
 * <ViewPortalDialog<Candidato>
 *   id={selectedId}
 *   open={open}
 *   onOpenChange={setOpen}
 *   fetchAction={getCandidato}
 *   title={c => c.nome}
 *   sections={data => [
 *     {
 *       value: 'dados',
 *       label: 'Data',
 *       icon: 'User',
 *       content: <DetailField label="Name" value={data.nome} />,
 *       edit: { fields: [{ name: 'nome', label: 'Name', type: 'text' }] },
 *     },
 *   ]}
 *   validation={candidatoSchema}
 *   onSaveSection={(values) => updateCandidato(selectedId!, values)}
 * />
 * ```
 *
 * @category Dialogs
 */
export function ViewPortalDialog<T extends Record<string, unknown>>({
  sections,
  defaultSection,
  columns,
  validation,
  onSaveSection,
  onOpenChange,
  ...viewDialogProps
}: ViewPortalDialogProps<T>) {
  const guard = useUnsavedChangesGuard()

  // Pre-6.6 consumers still pass onEdit/onDelete at runtime (the type already
  // rejects them); swallowing here guarantees the ViewDialog footer never
  // renders. Delete lives in the list's row actions.
  const {
    onEdit: _legacyOnEdit,
    onDelete: _legacyOnDelete,
    deleteConfirmation: _legacyDeleteConfirmation,
    ...safeViewDialogProps
  } = viewDialogProps as typeof viewDialogProps & {
    onEdit?: unknown
    onDelete?: unknown
    deleteConfirmation?: unknown
  }

  // Guards ESC / click-outside / the shell's X — anything that would close
  // the ViewDialog while a section's edit form is dirty.
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(nextOpen)
      } else {
        guard.guard(() => onOpenChange(false))
      }
    },
    [guard, onOpenChange]
  )

  return (
    <>
      <ViewDialog<T>
        {...safeViewDialogProps}
        onOpenChange={handleOpenChange}
        renderContent={data => (
          <PortalBody<T>
            data={data}
            sections={sections(data)}
            recordId={String(safeViewDialogProps.id ?? data.id ?? '')}
            defaultSection={defaultSection}
            columns={columns}
            monolithicValidation={validation}
            onSaveSection={onSaveSection}
            guard={guard}
          />
        )}
      />
      {guard.dialog}
    </>
  )
}
