'use client'

import type { UseFormReturn, FieldValues } from 'react-hook-form'
import { AdminFormRenderer } from '../AdminFormRenderer'
import type { FormField } from '../../../types/forms/admin-form'
import type { useTelamonjsT } from '../../../i18n/use-t'

/**
 * Render context threaded through renderField/renderFieldGroup — carries
 * what the AdminForm closures used to capture directly (form instance,
 * edit-mode id, initial data, default grid).
 */
export interface AdminFormRenderContext<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  form: UseFormReturn<FieldValues>
  id?: string
  data?: Partial<T>
  grid?: string
  /**
   * i18n translator scoped to `telamonjs.*`. `renderFieldGroup` is a plain
   * function (not a component/hook), so it cannot call `useTelamonjsT()`
   * itself — the caller (a real component) provides it here.
   */
  t: ReturnType<typeof useTelamonjsT>
}

/** Render a single field using AdminFormRenderer. */
export function renderField<T extends Record<string, unknown>>(
  ctx: AdminFormRenderContext<T>,
  formField: FormField,
  entityId?: string
) {
  return (
    <AdminFormRenderer
      field={formField}
      control={ctx.form.control}
      setValue={ctx.form.setValue}
      form={ctx.form}
      id={entityId}
    />
  )
}
