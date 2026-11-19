'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { FieldValues } from 'react-hook-form'
import { z } from 'zod'
import { AdminForm } from '../forms/AdminForm'
import type { FormField, FormSection } from '../../types/forms/admin-form'
import type { FieldType } from '../../field-system/field-registry'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { toast } from 'sonner'
import { getErrorMessage } from '../../utils/error-message'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { SubList, type SubListField } from './sub-list'
import { SubListSkeleton } from './sub-list-skeleton'
import { Plus } from 'lucide-react'
import { useRecordRefresh } from '../../contexts/RecordRefreshContext'

// Helper function to convert legacy Fields/Sections to AdminForm format
function convertLegacyFieldsToAdminForm(
  fields: unknown
): FormField[] | FormSection[] {
  // Check if it's sections (must have BOTH 'label' AND 'fields' properties)
  if (
    Array.isArray(fields) &&
    fields.length > 0 &&
    typeof fields[0] === 'object' &&
    fields[0] !== null &&
    'label' in fields[0] &&
    'fields' in fields[0] // ← FIX: Check 'fields' too!
  ) {
    return fields.map((section: Record<string, unknown>) => ({
      label: section.label as string,
      fields: flattenFields(section.fields).map(convertSingleField),
    })) as FormSection[]
  }

  // It's just Fields - could be nested arrays
  return flattenFields(fields).map(convertSingleField) as FormField[]
}

function flattenFields(fields: unknown): unknown[] {
  const result: unknown[] = []

  function processField(field: unknown): void {
    if (Array.isArray(field)) {
      field.forEach(processField)
    } else {
      result.push(field)
    }
  }

  if (Array.isArray(fields)) {
    fields.forEach(processField)
  }
  return result
}

function convertSingleField(field: unknown): FormField {
  const fieldObj = field as Record<string, unknown>
  const fieldField = fieldObj.field as string | undefined
  const fieldName = fieldObj.name as string | undefined

  const converted: Partial<FormField> = {
    name: fieldField?.includes('.')
      ? fieldField.split('.').pop()
      : fieldField || fieldName || '',
    label: fieldObj.label as string,
    type: convertFieldType(fieldObj.type as string),
    required: fieldObj.required as boolean | undefined,
    placeholder: fieldObj.placeholder as string | undefined,
    readOnly: fieldObj.readOnly as boolean | undefined,
    focus: fieldObj.focus as boolean | undefined,
  }

  // Add field-specific properties
  if (fieldObj.loadField)
    converted.loadField = fieldObj.loadField as FormField['loadField']
  if (fieldObj.dependsOn) converted.dependsOn = fieldObj.dependsOn as string
  if (fieldObj.mask) converted.mask = fieldObj.mask as string
  if (fieldObj.maskType) converted.maskType = fieldObj.maskType as string
  if (fieldObj.uploadFn)
    converted.uploadFn = fieldObj.uploadFn as FormField['uploadFn']
  if (fieldObj.path) converted.path = fieldObj.path as string
  if (fieldObj.Component)
    converted.Component = fieldObj.Component as FormField['Component']
  if (fieldObj.default !== undefined) converted.default = fieldObj.default
  // without this, every field inside a nested CrudField stays stuck in 1
  // grid column, even when declaring span
  if (fieldObj.span) converted.span = fieldObj.span as FormField['span']
  if (fieldObj.description)
    converted.description = fieldObj.description as FormField['description']

  return converted as FormField
}

function convertFieldType(legacyType: string): FieldType {
  // Only convert legacy types that differ from current system
  // 'text' is already the correct type for text input in the new system
  const typeMap: Record<string, FieldType> = {
    string: 'text', // legacy 'string' → current 'text'
    integer: 'number',
    decimal: 'float',
    tel: 'masked',
    multi: 'multiselect',
  }

  return typeMap[legacyType] || (legacyType as FieldType)
}

interface CrudFieldProps {
  field: FormField // The FormField with CRUD configuration
  id?: string
  onChange?: (values: { create: unknown[] }) => void
}

export default function CrudField({ field, id, onChange }: CrudFieldProps) {
  const t = useTelamonjsT()
  const text = useText()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState(false)
  const [data, setData] = useState<Record<string, unknown>[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editData, setEditData] = useState<FieldValues | undefined>(undefined)
  const [editRowId, setEditRowId] = useState<string>('')
  // the dialog header counters live on the parent record, not on this list
  const refreshRecord = useRecordRefresh()

  // Normalize crudConfig to field properties
  // Support both direct field props and nested crudConfig
  const crudConfig = field.crudConfig
  // loadForEdit has its own contract with the REVERSE order of CrudLoadFn:
  // (parentId, itemId). The adapter preserves what each type promises — the
  // crudConfig consumers keep receiving parentId first.
  const loadForEdit = crudConfig?.loadForEdit as
    | ((parentId: string, itemId: string) => Promise<unknown>)
    | undefined
  const config = {
    fields: field.fields || crudConfig?.fields,
    listFields: field.listFields || crudConfig?.columns,
    listingFn: field.listingFn || crudConfig?.loadData,
    loadFn:
      field.loadFn ||
      (loadForEdit
        ? (itemId: string, parentId?: string) =>
            loadForEdit(parentId ?? '', itemId)
        : undefined),
    createFn: field.createFn || crudConfig?.create,
    editFn: field.editFn || crudConfig?.update,
    deleteFn: field.deleteFn || crudConfig?.delete,
    validation: field.validation || crudConfig?.validation,
    readOnly: field.readOnly,
    manyToMany: field.manyToMany,
  }
  // Header/empty-state copy (crudConfig format only; I18nText)
  const copy = field.crudConfig

  // Convert legacy fields to AdminForm format
  const convertedFields = config.fields
    ? convertLegacyFieldsToAdminForm(config.fields)
    : []
  // Only treat as sections if it's an array of objects with 'label' and 'fields' properties
  const hasMultipleSections =
    Array.isArray(convertedFields) &&
    convertedFields.length > 0 &&
    convertedFields.every(
      (item: unknown) =>
        item && typeof item === 'object' && 'label' in item && 'fields' in item
    )

  // Receives typed values from react-hook-form (AdminForm.onSubmitValues).
  // Do not use the FormData mode: it serializes everything with String(), and a
  // boolean field would arrive as 'true'/'false' in the consumer's createFn/editFn.
  const createAction = async (values: Record<string, unknown>) => {
    if (!id) {
      // Handle offline mode
      const newData = (data || []).concat(values)
      setData(newData)
      onChange?.({ create: newData })
      return { success: true }
    }

    try {
      const fn = config.createFn
      // AdminForm copies its `id` prop (here: the PARENT id, given so `component`
      // renderers can use it) into the submitted values. It is not a child field —
      // APIs that whitelist the DTO reject it (`property id should not exist`).
      const { id: injectedId, ...childValues } = values
      const payload = injectedId === id ? childValues : values
      const response = await fn?.(payload, { id })
      if (response === true) {
        toast.success(t('toast.itemCreated'))
        loadData()
        refreshRecord?.()
        return { success: true }
      } else if (
        response &&
        typeof response === 'object' &&
        'status' in response
      ) {
        const resp = response as Record<string, unknown>
        if (resp.status === 'success') {
          toast.success(resp.description as string)
          loadData()
          refreshRecord?.()
          return { success: true }
        } else if (resp.status === 'error') {
          return { success: false, message: getErrorMessage(resp.description) ?? t('toast.unknownError') }
        }
      }
      return { success: false }
    } catch (error: unknown) {
      // AdminForm shows (toast + inline) the message we return — toasting here
      // too duplicated it, and returning no message made AdminForm fall back to
      // the generic "Erro ao processar formulário".
      return { success: false, message: getErrorMessage(error) ?? t('toast.unknownError') }
    }
  }

  const editAction = async (values: Record<string, unknown>) => {
    if (!config.editFn || !editData) return { success: false }

    try {
      const fn = config.editFn
      // In an N:M list loadFn returns the item without `id`, so the fallback is the
      // id of the row that opened the dialog — without it the consumer doesn't know what to edit.
      const itemId =
        ((editData[field.name] as Record<string, unknown>)?.id as string) ||
        editRowId ||
        ''
      const response = await fn(values, { id: id || '', itemId })
      if (response === true) {
        toast.success(t('toast.itemUpdated'))
        loadData()
        refreshRecord?.()
        return { success: true }
      } else if (
        response &&
        typeof response === 'object' &&
        'status' in response
      ) {
        const resp = response as Record<string, unknown>
        if (resp.status === 'success') {
          toast.success(resp.description as string)
          loadData()
          refreshRecord?.()
          return { success: true }
        } else if (resp.status === 'error') {
          return { success: false, message: getErrorMessage(resp.description) ?? t('toast.unknownError') }
        }
      }
      return { success: false }
    } catch (error: unknown) {
      // AdminForm shows (toast + inline) the message we return — toasting here
      // too duplicated it, and returning no message made AdminForm fall back to
      // the generic "Erro ao processar formulário".
      return { success: false, message: getErrorMessage(error) ?? t('toast.unknownError') }
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (id && config.listingFn) {
        const fn = config.listingFn as (params: {
          id: string
        }) => Promise<Record<string, unknown>[]>
        setData(await fn({ id }))
      } else {
        setData([])
      }
    } finally {
      setLoading(false)
    }
  }, [id, config.listingFn])

  async function onLoad(rowId: string | undefined) {
    let data: FieldValues | undefined

    if (config.loadFn) {
      // CrudLoadFn is `(id) => ...` (the item's id), as in the docs
      // (`loadFn: regionaisApi.getById`). The parent id goes as the 2nd argument
      // for whoever needs it.
      const fn = config.loadFn as (
        itemId: string,
        parentId: string
      ) => Promise<unknown>
      const rawData = await fn(rowId || '', id || '')
      const rawObj = rawData as Record<string, unknown> | undefined
      // Wrap data in the expected format if it's not already wrapped
      if (rawObj && !(field.name in rawObj)) {
        data = { [field.name]: rawData } as FieldValues
      } else {
        data = rawObj as FieldValues
      }
    }

    setEditData(data)
    setEditRowId(rowId || '')
    setEdit(true)
    setOpen(true)
  }

  async function onDelete(
    rowIdOrParams: string | { id: string; parentId: string }
  ): Promise<unknown> {
    if (id && config.deleteFn) {
      // Row id (string, or number for Int PKs — typed string but not at runtime)
      // or { parentId, id } from manyToMany
      const formData =
        typeof rowIdOrParams === 'object' && rowIdOrParams !== null
          ? rowIdOrParams.id
          : String(rowIdOrParams)

      const fn = config.deleteFn
      // 1:N gets the parent as a 2nd arg — never inside `params`, which
      // consumers forward as the request query (forbidNonWhitelisted)
      const call =
        config.manyToMany === true
          ? fn({ parentId: id, id: formData })
          : fn({ id: formData }, { parentId: id })
      // Toasts are SubList's job (it awaits this promise): a rejection
      // propagates there as the error toast, and the list is not reloaded.
      const response = await call
      loadData()
      refreshRecord?.()
      return response
    } else {
      const rowId =
        typeof rowIdOrParams === 'string' ? rowIdOrParams : rowIdOrParams.id
      const newData = (data || []).filter(item => {
        const itemObj = item as Record<string, unknown>
        return Object.values(itemObj)[0] !== rowId
      })

      setData(newData)
      onChange?.({
        create: newData,
      })
      return undefined
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculate number of columns for skeleton based on listFields
  const skeletonColumns =
    (config.listFields as SubListField[] | undefined)?.length || 3

  // Add button component for leftActions
  const AddButton = !config.readOnly ? (
    <Button
      size='sm'
      variant='secondary'
      className='h-8 gap-1.5'
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        setOpen(!open)
      }}
      data-testid='crud-field-add-button'
    >
      <Plus className='h-4 w-4' />
      {t('common.create')}
    </Button>
  ) : null

  return (
    <div className='h-full flex flex-col'>
      {(copy?.title || copy?.description) && (
        <div className='mb-2'>
          {copy.title && <p className='text-sm font-medium'>{text(copy.title)}</p>}
          {copy.description && (
            <p className='text-xs text-muted-foreground'>{text(copy.description)}</p>
          )}
        </div>
      )}
      <Dialog
        modal={false}
        open={open}
        onOpenChange={(open: boolean) => {
          setEdit(false)
          setOpen(open)
        }}
      >
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {edit ? t('common.edit') : t('common.add')} {text(field.label)}
            </DialogTitle>
          </DialogHeader>
          {!edit && (
            <AdminForm
              fields={
                hasMultipleSections
                  ? undefined
                  : (convertedFields as FormField[])
              }
              sections={
                hasMultipleSections
                  ? (convertedFields as FormSection[])
                  : undefined
              }
              onSubmitValues={createAction}
              validation={config.validation as z.ZodType | undefined}
              id={id}
              cancelAction={() => setOpen(false)}
              onSuccess={() => setOpen(false)}
              grid='2'
            />
          )}
          {edit && editData && (
            <AdminForm
              fields={
                hasMultipleSections
                  ? undefined
                  : (convertedFields as FormField[])
              }
              sections={
                hasMultipleSections
                  ? (convertedFields as FormSection[])
                  : undefined
              }
              onSubmitValues={editAction}
              validation={config.validation as z.ZodType | undefined}
              data={editData[field.name] || editData}
              id={
                ((editData[field.name] as Record<string, unknown>)
                  ?.id as string) ||
                editRowId ||
                id
              }
              cancelAction={() => {
                setEdit(false)
                setOpen(false)
              }}
              onSuccess={() => {
                setEdit(false)
                setOpen(false)
              }}
              grid='2'
            />
          )}
        </DialogContent>
      </Dialog>

      {/* List Content */}
      <div className='flex-1 min-h-0'>
        {loading ? (
          <SubListSkeleton
            columns={skeletonColumns}
            rows={5}
            showToolbar={true}
          />
        ) : (
          <SubList
            id={id}
            listFields={config.listFields as SubListField[]}
            loadFn={
              // without editFn the edit dialog has nowhere to submit to:
              // the Edit button would appear and always fail
              config.readOnly || !config.loadFn || !config.editFn
                ? undefined
                : onLoad
            }
            deleteFn={
              // without deleteFn onDelete is a silent no-op: hide the trash
              config.readOnly || !config.deleteFn
                ? undefined
                : onDelete
            }
            data={data || []}
            manyToMany={config.manyToMany as boolean}
            enableSearch={true}
            enableColumnVisibility={true}
            enableSorting={true}
            enablePagination={true}
            className='h-full'
            onRefresh={loadData}
            loading={loading}
            leftActions={AddButton}
            emptyState={{
              title: text(copy?.emptyTitle) ?? t('list.noRecords'),
              description: text(copy?.emptyDescription),
            }}
          />
        )}
      </div>

      {/* Optional Footer */}
      {field.Footer &&
        React.createElement(
          field.Footer as React.ComponentType<{
            id?: string
            data: unknown[]
            onRefresh?: () => void
          }>,
          { id, data: data || [], onRefresh: loadData }
        )}
    </div>
  )
}
